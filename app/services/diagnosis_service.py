from typing import Dict, Any
from app.models.transaction import Transaction
from app.models.customer import Customer
from app.schemas.recovery import DiagnosisResult
from app.services.ai import get_ai_service


class DiagnosisService:
    def __init__(self):
        self.ai_service = get_ai_service()

    def diagnose(
        self,
        transaction: Transaction,
        customer: Customer,
        previous_attempts: int = 0,
    ) -> DiagnosisResult:
        transaction_data = {
            "id": transaction.id,
            "external_transaction_id": transaction.external_transaction_id,
            "amount": transaction.amount,
            "currency": transaction.currency,
            "payment_method": transaction.payment_method,
            "transaction_type": transaction.transaction_type,
            "status": transaction.status,
            "failure_reason": transaction.failure_reason,
            "failure_category": transaction.failure_category,
            "occurred_at": transaction.occurred_at.isoformat() if transaction.occurred_at else None,
        }

        customer_data = {
            "id": customer.id,
            "name": customer.name,
            "total_successful_transactions": customer.total_successful_transactions,
            "total_failed_transactions": customer.total_failed_transactions,
            "lifetime_value": customer.lifetime_value,
        }

        history_data = {
            "previous_attempts": previous_attempts,
        }

        return self.ai_service.diagnose_root_cause(
            transaction_data=transaction_data,
            customer_data=customer_data,
            history_data=history_data,
        )
