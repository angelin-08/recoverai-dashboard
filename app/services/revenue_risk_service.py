from typing import List
from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.services.audit_service import AuditService
from app.services.diagnosis_service import DiagnosisService
from app.services.recovery_scoring_service import RecoveryScoringService
from app.utils.scoring import calculate_priority_score, calculate_expected_recovery_value
from app.utils.helpers import get_hours_difference


class RevenueRiskService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
        self.diagnosis_service = DiagnosisService()
        self.scoring_service = RecoveryScoringService()

    def scan_and_detect_risks(self, merchant_id: str) -> List[RecoveryCase]:
        """
        Scans transactions for potential revenue leakage:
        - Status in ['FAILED', 'ABANDONED', 'OVERDUE', 'PENDING']
        - Not in ['SUCCESS', 'RECOVERED']
        - Skips transactions that already have an associated recovery case.
        """
        eligible_statuses = ["FAILED", "ABANDONED", "OVERDUE"]
        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.merchant_id == merchant_id,
                Transaction.status.in_(eligible_statuses),
            )
            .all()
        )

        detected_cases: List[RecoveryCase] = []

        for txn in transactions:
            # Check if case already exists
            existing_case = self.db.query(RecoveryCase).filter(RecoveryCase.transaction_id == txn.id).first()
            if existing_case:
                continue

            customer = txn.customer
            diagnosis = self.diagnosis_service.diagnose(txn, customer, previous_attempts=0)
            scoring = self.scoring_service.calculate_score(txn, customer, previous_attempts=0)
            hours_elapsed = get_hours_difference(txn.occurred_at)

            priority_score, priority_level, urgency_text = calculate_priority_score(
                amount=txn.amount,
                recovery_probability=scoring.recovery_probability,
                customer_success_count=customer.total_successful_transactions,
                customer_failure_count=customer.total_failed_transactions,
                hours_since_failure=hours_elapsed,
                previous_attempts=0,
            )

            rec_case = RecoveryCase(
                transaction_id=txn.id,
                revenue_at_risk=txn.amount,
                estimated_recoverable_amount=scoring.expected_recovery_value,
                recovery_probability=scoring.recovery_probability,
                priority_score=priority_score,
                root_cause=diagnosis.root_cause,
                recommended_action=diagnosis.recommended_action,
                confidence_score=diagnosis.confidence_score,
                status="DETECTED",
            )
            self.db.add(rec_case)
            self.db.commit()
            self.db.refresh(rec_case)

            # Emit audit log for detection
            self.audit_service.log_event(
                merchant_id=merchant_id,
                event_type="REVENUE_DETECTED",
                actor="REVENUE_RISK_SERVICE",
                transaction_id=txn.id,
                recovery_case_id=rec_case.id,
                decision="CASE_CREATED",
                reason=f"Detected {txn.transaction_type} leak with status {txn.status}: {txn.failure_reason or 'Failure'}",
                result="DETECTED",
                metadata={
                    "amount": txn.amount,
                    "currency": txn.currency,
                    "priority_score": priority_score,
                    "recovery_probability": scoring.recovery_probability,
                },
            )

            detected_cases.append(rec_case)

        return detected_cases
