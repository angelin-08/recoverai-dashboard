import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.customer import Customer
from app.schemas.recovery import ExecutionResult
from app.integrations.razorpay.service import RazorpayService
from app.services.audit_service import AuditService
from app.utils.validators import validate_state_transition
from app.utils.helpers import utcnow


class RecoveryExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.rzp_service = RazorpayService()
        self.audit_service = AuditService(db)

    def execute_action(
        self,
        recovery_case: RecoveryCase,
        action_type: str,
        actor: str = "RECOVERY_AGENT",
        forced: bool = False,
    ) -> ExecutionResult:
        transaction = recovery_case.transaction
        customer = transaction.customer

        attempt_number = len(recovery_case.recovery_actions) + 1

        # Check special deterministic scenario indicators or probability
        is_deterministic_scenario_a = "Priya Nair" in customer.name or "TXN-SCENARIO-A" in transaction.external_transaction_id
        is_deterministic_scenario_c = "Meera Thomas" in customer.name or "TXN-FAIL-001" in transaction.external_transaction_id or "TXN-SCENARIO-C" in transaction.external_transaction_id

        should_succeed = False
        if is_deterministic_scenario_c:
            should_succeed = False
        elif is_deterministic_scenario_a or recovery_case.recovery_probability >= 70.0:
            should_succeed = True
        else:
            should_succeed = recovery_case.recovery_probability >= 50.0

        mode = "DEMO"
        result_message = ""
        action_status = "COMPLETED"
        details: Dict[str, Any] = {}

        if action_type == "PAYMENT_RECOVERY_LINK":
            rzp_data = self.rzp_service.generate_recovery_payment_link(transaction, customer, recovery_case.id)
            mode = rzp_data.get("mode", "DEMO")
            details["payment_link"] = rzp_data.get("short_url")
            details["link_id"] = rzp_data.get("payment_link_id")
            if should_succeed:
                result_message = f"Payment link generated and customer completed payment: {rzp_data.get('short_url')}"
                action_status = "COMPLETED"
            else:
                result_message = f"Payment link dispatched but customer did not settle: {rzp_data.get('short_url')}"
                action_status = "FAILED"

        elif action_type == "PAYMENT_RETRY":
            if should_succeed:
                result_message = f"Payment retry re-authorized successfully via bank switch ({mode} MODE)."
                action_status = "COMPLETED"
            else:
                result_message = f"Payment retry rejected by bank switch (Insufficient Funds / Do Not Honor) ({mode} MODE)."
                action_status = "FAILED"

        elif action_type == "CUSTOMER_REMINDER":
            result_message = f"Checkout recovery reminder dispatched via WhatsApp & Email to {customer.phone}."
            action_status = "COMPLETED" if should_succeed else "FAILED"

        elif action_type == "SUBSCRIPTION_RECOVERY":
            result_message = f"Smart dunning mandate recovery dispatched to customer's UPI app."
            action_status = "COMPLETED" if should_succeed else "FAILED"

        elif action_type == "INVOICE_REMINDER":
            result_message = f"B2B Invoice collection reminder dispatched with instant payment portal link."
            action_status = "COMPLETED" if should_succeed else "FAILED"

        elif action_type == "ESCALATE":
            result_message = "Recovery case escalated to Merchant Operations queue for manual concierge outreach."
            action_status = "COMPLETED"

        elif action_type == "STOP":
            result_message = "Recovery operations stopped per safety policy or merchant rejection."
            action_status = "COMPLETED"

        else:
            result_message = f"Executed generic recovery action '{action_type}'."
            action_status = "COMPLETED" if should_succeed else "FAILED"

        # Record RecoveryAction entry
        action_entry = RecoveryAction(
            recovery_case_id=recovery_case.id,
            action_type=action_type,
            attempt_number=attempt_number,
            amount=transaction.amount,
            status=action_status,
            reason=recovery_case.root_cause,
            result_message=result_message,
            executed_at=utcnow(),
        )
        self.db.add(action_entry)

        # Update State Machine
        if action_type == "STOP":
            validate_state_transition(recovery_case.status, "STOPPED")
            recovery_case.status = "STOPPED"
            self.audit_service.log_event(
                merchant_id=transaction.merchant_id,
                event_type="RECOVERY_STOPPED",
                actor=actor,
                transaction_id=transaction.id,
                recovery_case_id=recovery_case.id,
                action=action_type,
                result="STOPPED",
                reason=result_message,
            )
        elif action_type == "ESCALATE":
            validate_state_transition(recovery_case.status, "ESCALATED")
            recovery_case.status = "ESCALATED"
            transaction.status = "ESCALATED"
            self.audit_service.log_event(
                merchant_id=transaction.merchant_id,
                event_type="ESCALATED",
                actor=actor,
                transaction_id=transaction.id,
                recovery_case_id=recovery_case.id,
                action=action_type,
                result="ESCALATED",
                reason=result_message,
            )
        elif should_succeed and action_status == "COMPLETED":
            validate_state_transition(recovery_case.status, "RECOVERED")
            recovery_case.status = "RECOVERED"
            transaction.status = "RECOVERED"
            customer.total_successful_transactions += 1
            customer.lifetime_value += transaction.amount

            self.audit_service.log_event(
                merchant_id=transaction.merchant_id,
                event_type="RECOVERY_SUCCESSFUL",
                actor=actor,
                transaction_id=transaction.id,
                recovery_case_id=recovery_case.id,
                action=action_type,
                result="RECOVERED",
                reason=result_message,
                metadata={"amount_recovered": transaction.amount, "attempt_number": attempt_number},
            )
        else:
            # Action failed or requires next attempt
            if attempt_number >= 2:
                validate_state_transition(recovery_case.status, "STOPPED")
                recovery_case.status = "STOPPED"
                self.audit_service.log_event(
                    merchant_id=transaction.merchant_id,
                    event_type="RECOVERY_STOPPED",
                    actor="GUARDRAIL_ENGINE",
                    transaction_id=transaction.id,
                    recovery_case_id=recovery_case.id,
                    action=action_type,
                    result="STOPPED",
                    reason=f"Maximum automated attempts reached ({attempt_number}). Recovery halted for safety.",
                )
            else:
                validate_state_transition(recovery_case.status, "FAILED")
                recovery_case.status = "FAILED"
                self.audit_service.log_event(
                    merchant_id=transaction.merchant_id,
                    event_type="ACTION_FAILED",
                    actor=actor,
                    transaction_id=transaction.id,
                    recovery_case_id=recovery_case.id,
                    action=action_type,
                    result="FAILED",
                    reason=result_message,
                    metadata={"attempt_number": attempt_number},
                )

        recovery_case.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(recovery_case)

        return ExecutionResult(
            case_id=recovery_case.id,
            action_type=action_type,
            attempt_number=attempt_number,
            status=recovery_case.status,
            result_message=result_message,
            mode=mode,
            amount_recovered=transaction.amount if recovery_case.status == "RECOVERED" else 0.0,
            details=details,
        )
