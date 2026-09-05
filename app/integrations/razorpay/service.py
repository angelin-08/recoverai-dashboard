import uuid
from typing import Dict, Any, Optional
from app.integrations.razorpay.client import RazorpayClient
from app.models.transaction import Transaction
from app.models.customer import Customer


class RazorpayService:
    """
    Razorpay integration service for Autonomous Recovery.
    Dispatches real Razorpay Test API calls if test keys are present;
    otherwise safely falls back to deterministic DEMO mode with transparent labeling.
    """

    def __init__(self, client: Optional[RazorpayClient] = None):
        self.client = client or RazorpayClient()

    def generate_recovery_payment_link(
        self,
        transaction: Transaction,
        customer: Customer,
        recovery_case_id: str,
    ) -> Dict[str, Any]:
        amount_in_paise = int(round(transaction.amount * 100))

        if self.client.is_configured:
            payload = {
                "amount": amount_in_paise,
                "currency": transaction.currency or "INR",
                "accept_partial": False,
                "description": f"RecoverAI Recovery Link for Order #{transaction.order_id or transaction.id}",
                "customer": {
                    "name": customer.name,
                    "email": customer.email,
                    "contact": customer.phone,
                },
                "notify": {"sms": True, "email": True},
                "reminder_enable": True,
                "notes": {
                    "recovery_case_id": recovery_case_id,
                    "transaction_id": transaction.id,
                    "source": "RecoverAI Agent",
                },
            }
            try:
                rzp_resp = self.client.create_payment_link(payload)
                return {
                    "mode": "RAZORPAY_TEST",
                    "payment_link_id": rzp_resp.get("id"),
                    "short_url": rzp_resp.get("short_url"),
                    "status": rzp_resp.get("status", "created"),
                    "raw_response": rzp_resp,
                }
            except Exception as e:
                # If API call failed, fall back to safe demo mode simulation
                return {
                    "mode": "DEMO",
                    "payment_link_id": f"plink_demo_{uuid.uuid4().hex[:10]}",
                    "short_url": f"https://rzp.io/i/demo_{uuid.uuid4().hex[:8]}",
                    "status": "created",
                    "error_fallback": str(e),
                }

        # Deterministic DEMO fallback
        return {
            "mode": "DEMO",
            "payment_link_id": f"plink_demo_{uuid.uuid4().hex[:10]}",
            "short_url": f"https://rzp.io/i/demo_{uuid.uuid4().hex[:8]}",
            "status": "created",
            "notes": "Generated in RecoverAI DEMO Mode (Configure RAZORPAY_KEY_ID for Test API)",
        }
