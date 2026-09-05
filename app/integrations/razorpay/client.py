import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("recoverai.razorpay")


class RazorpayClient:
    """
    Razorpay Test Mode API Client.
    Only connects to Razorpay in test environment using test key/secret.
    """

    def __init__(
        self,
        key_id: Optional[str] = None,
        key_secret: Optional[str] = None,
        environment: Optional[str] = None,
    ):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID
        self.key_secret = key_secret or settings.RAZORPAY_KEY_SECRET
        self.environment = environment or settings.RAZORPAY_ENVIRONMENT or "test"
        self.base_url = "https://api.razorpay.com/v1"

    @property
    def is_configured(self) -> bool:
        return bool(self.key_id and self.key_secret and len(self.key_id.strip()) > 0)

    def create_payment_link(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a payment link using Razorpay Test Mode API.
        """
        if not self.is_configured:
            raise RuntimeError("Razorpay credentials are not configured. Use Demo mode.")

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    f"{self.base_url}/payment_links",
                    auth=(self.key_id, self.key_secret),
                    json=payload,
                )
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error("Razorpay API Error: %s %s", response.status_code, response.text)
                    raise RuntimeError(f"Razorpay API Error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.exception("Failed to connect to Razorpay test API: %s", e)
            raise
