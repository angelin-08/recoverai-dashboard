from fastapi import APIRouter
from app.schemas.common import ResponseEnvelope
from app.core.config import settings
from app.utils.helpers import utcnow

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=ResponseEnvelope[dict])
def check_health():
    return ResponseEnvelope(
        success=True,
        data={
            "status": "healthy",
            "service": settings.APP_NAME,
            "environment": settings.APP_ENV,
            "timestamp": utcnow().isoformat(),
            "razorpay_mode": "RAZORPAY_TEST" if settings.RAZORPAY_KEY_ID else "DEMO",
            "ai_mode": "OPENAI" if settings.OPENAI_API_KEY else "MOCK_AI",
        },
        message="RecoverAI service is online and operational.",
    )
