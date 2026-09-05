from app.core.config import settings
from app.services.ai.base import BaseAIService
from app.services.ai.openai_service import OpenAIService
from app.services.ai.mock_ai_service import MockAIService


def get_ai_service() -> BaseAIService:
    """
    Factory that supplies the AI Service.
    If OPENAI_API_KEY is configured, returns OpenAIService; otherwise returns deterministic MockAIService.
    """
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
        return OpenAIService()
    return MockAIService()


__all__ = ["BaseAIService", "OpenAIService", "MockAIService", "get_ai_service"]
