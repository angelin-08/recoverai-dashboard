import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.recovery import (
    AnalysisResponse,
    DiagnosisResult,
    ScoringResult,
    PriorityResult,
    GuardrailEvaluation,
    ExecutionResult,
)
from app.services.diagnosis_service import DiagnosisService
from app.services.recovery_scoring_service import RecoveryScoringService
from app.services.guardrail_service import GuardrailService
from app.services.recovery_execution_service import RecoveryExecutionService
from app.services.audit_service import AuditService
from app.utils.scoring import calculate_priority_score
from app.utils.helpers import get_hours_difference
from app.utils.validators import (
    validate_state_transition,
    BusinessRuleViolationError,
    InvalidStateTransitionError,
    CaseNotFoundError,
)


class RecoveryAgent:
    """
    Central Autonomous Revenue Recovery Agent Orchestrator.
    Executes the end-to-end cognitive loop:
    Detect → Diagnose → Score → Prioritize → Recommend Action → Apply Guardrails → Execute / Stage → Audit
    """

    def __init__(self, db: Session):
        self.db = db
        self.diagnosis_service = DiagnosisService()
        self.scoring_service = RecoveryScoringService()
        self.guardrail_service = GuardrailService()
        self.execution_service = RecoveryExecutionService(db)
        self.audit_service = AuditService(db)

    def analyze_case(self, case_id: str) -> AnalysisResponse:
        case = self.db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise CaseNotFoundError(f"Recovery case '{case_id}' not found.")

        transaction = case.transaction
        customer = transaction.customer
        attempt_count = len(case.recovery_actions)

        # 1. Diagnose
        diagnosis = self.diagnosis_service.diagnose(transaction, customer, previous_attempts=attempt_count)
        self.audit_service.log_event(
            merchant_id=transaction.merchant_id,
            event_type="DIAGNOSIS_COMPLETED",
            actor="RECOVERY_AGENT",
            transaction_id=transaction.id,
            recovery_case_id=case.id,
            decision=diagnosis.recommended_action,
            reason=diagnosis.explanation,
            metadata={"root_cause": diagnosis.root_cause, "confidence": diagnosis.confidence_score},
        )

        # 2. Score
        scoring = self.scoring_service.calculate_score(transaction, customer, previous_attempts=attempt_count)
        self.audit_service.log_event(
            merchant_id=transaction.merchant_id,
            event_type="RECOVERY_SCORED",
            actor="RECOVERY_AGENT",
            transaction_id=transaction.id,
            recovery_case_id=case.id,
            decision="SCORED",
            reason="Calculated explainable win probability and confidence",
            metadata={
                "recovery_probability": scoring.recovery_probability,
                "confidence_score": scoring.confidence_score,
                "factors": scoring.contributing_factors,
            },
        )

        # 3. Prioritize
        hours_elapsed = get_hours_difference(transaction.occurred_at)
        priority_score, priority_level, urgency_text = calculate_priority_score(
            amount=transaction.amount,
            recovery_probability=scoring.recovery_probability,
            customer_success_count=customer.total_successful_transactions,
            customer_failure_count=customer.total_failed_transactions,
            hours_since_failure=hours_elapsed,
            previous_attempts=attempt_count,
        )

        # 4. Guardrail Evaluation
        guardrail = self.guardrail_service.evaluate_case(
            transaction=transaction,
            recovery_case=case,
            confidence_score=diagnosis.confidence_score,
            attempt_number=attempt_count + 1,
        )
        self.audit_service.log_event(
            merchant_id=transaction.merchant_id,
            event_type="GUARDRAIL_CHECKED",
            actor="GUARDRAIL_ENGINE",
            transaction_id=transaction.id,
            recovery_case_id=case.id,
            decision="APPROVED" if guardrail.allowed else ("APPROVAL_REQUIRED" if guardrail.requires_approval else "BLOCKED"),
            reason=guardrail.reason,
            metadata={"rule_triggered": guardrail.rule_triggered},
        )

        # Update case entity with refreshed intelligence
        case.root_cause = diagnosis.root_cause
        case.recommended_action = diagnosis.recommended_action
        case.confidence_score = diagnosis.confidence_score
        case.recovery_probability = scoring.recovery_probability
        case.estimated_recoverable_amount = scoring.expected_recovery_value
        case.priority_score = priority_score
        case.updated_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

        # Update status according to guardrail
        if case.status in ["DETECTED", "ANALYZED", "READY"]:
            if guardrail.requires_approval:
                validate_state_transition(case.status, "APPROVAL_REQUIRED")
                case.status = "APPROVAL_REQUIRED"
                self.audit_service.log_event(
                    merchant_id=transaction.merchant_id,
                    event_type="APPROVAL_REQUESTED",
                    actor="RECOVERY_AGENT",
                    transaction_id=transaction.id,
                    recovery_case_id=case.id,
                    reason=guardrail.reason,
                )
            elif not guardrail.allowed and guardrail.rule_triggered in ["RULE_MAX_ATTEMPTS_EXCEEDED", "RULE_TERMINAL_SUCCESS", "RULE_CASE_STOPPED"]:
                # Cannot proceed
                pass
            else:
                validate_state_transition(case.status, "READY")
                case.status = "READY"

        self.db.commit()
        self.db.refresh(case)

        return AnalysisResponse(
            case_id=case.id,
            transaction_id=transaction.id,
            diagnosis=diagnosis,
            scoring=scoring,
            priority=PriorityResult(
                priority_score=priority_score,
                priority_level=priority_level,
                urgency_reason=urgency_text,
            ),
            guardrail=guardrail,
            recommended_action=diagnosis.recommended_action,
            status=case.status,
        )

    def process_and_execute_case(
        self,
        case_id: str,
        force_override: bool = False,
        custom_action: Optional[str] = None,
        actor: str = "RECOVERY_AGENT",
    ) -> ExecutionResult:
        case = self.db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise CaseNotFoundError(f"Recovery case '{case_id}' not found.")

        # Re-run guardrail check before execution
        guardrail = self.guardrail_service.evaluate_case(
            transaction=case.transaction,
            recovery_case=case,
            confidence_score=case.confidence_score,
            attempt_number=len(case.recovery_actions) + 1,
        )

        if not guardrail.allowed and not (case.status == "APPROVED" and guardrail.requires_approval is False):
            if guardrail.requires_approval:
                if case.status != "APPROVED":
                    validate_state_transition(case.status, "APPROVAL_REQUIRED")
                    case.status = "APPROVAL_REQUIRED"
                    self.db.commit()
                    raise BusinessRuleViolationError(
                        f"Action blocked by Guardrails: {guardrail.reason} (Case moved to APPROVAL_REQUIRED)"
                    )
            else:
                raise BusinessRuleViolationError(f"Action blocked by Guardrails: {guardrail.reason}")

        # Transition to IN_PROGRESS
        validate_state_transition(case.status, "IN_PROGRESS")
        case.status = "IN_PROGRESS"
        self.db.commit()

        # Choose action
        action_to_run = custom_action or case.recommended_action or "PAYMENT_RECOVERY_LINK"

        # Execute
        result = self.execution_service.execute_action(
            recovery_case=case,
            action_type=action_to_run,
            actor=actor,
            forced=force_override,
        )
        result.guardrail_decision = guardrail
        return result

    def approve_case(self, case_id: str, notes: Optional[str] = None, reviewer: str = "Merchant Admin") -> RecoveryCase:
        case = self.db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise CaseNotFoundError(f"Recovery case '{case_id}' not found.")

        if case.status != "APPROVAL_REQUIRED":
            raise InvalidStateTransitionError(
                f"Cannot approve case in '{case.status}' status. Only 'APPROVAL_REQUIRED' cases can be approved."
            )

        validate_state_transition(case.status, "APPROVED")
        case.status = "APPROVED"
        case.updated_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        self.db.commit()

        self.audit_service.log_event(
            merchant_id=case.transaction.merchant_id,
            event_type="APPROVAL_GRANTED",
            actor="MERCHANT_ADMIN",
            transaction_id=case.transaction.id,
            recovery_case_id=case.id,
            decision="APPROVED",
            reason=notes or f"Approved by {reviewer} for autonomous execution",
            action="MANUAL_APPROVAL",
            result="APPROVED",
        )
        return case

    def reject_case(self, case_id: str, notes: Optional[str] = None, reviewer: str = "Merchant Admin") -> RecoveryCase:
        case = self.db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
        if not case:
            raise CaseNotFoundError(f"Recovery case '{case_id}' not found.")

        if case.status != "APPROVAL_REQUIRED":
            raise InvalidStateTransitionError(
                f"Cannot reject case in '{case.status}' status. Only 'APPROVAL_REQUIRED' cases can be rejected."
            )

        validate_state_transition(case.status, "STOPPED")
        case.status = "STOPPED"
        case.updated_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        self.db.commit()

        self.audit_service.log_event(
            merchant_id=case.transaction.merchant_id,
            event_type="APPROVAL_REJECTED",
            actor="MERCHANT_ADMIN",
            transaction_id=case.transaction.id,
            recovery_case_id=case.id,
            decision="REJECTED",
            reason=notes or f"Rejected by {reviewer}. Recovery halted.",
            action="MANUAL_REJECTION",
            result="STOPPED",
        )
        return case
