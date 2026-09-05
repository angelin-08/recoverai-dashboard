from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.schemas.recovery import DiagnosisResult


class BaseAIService(ABC):
    @abstractmethod
    def diagnose_root_cause(
        self,
        transaction_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        history_data: Dict[str, Any],
    ) -> DiagnosisResult:
        """Diagnose root cause and recommend optimal recovery action."""
        pass

    @abstractmethod
    def generate_case_explanation(
        self,
        decision: str,
        transaction_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        score_data: Dict[str, Any],
    ) -> str:
        """Generate human-readable audit explanation for a recovery decision."""
        pass

    @abstractmethod
    def generate_executive_insights(
        self,
        metrics_data: Dict[str, Any],
        top_leak_categories: List[Dict[str, Any]],
    ) -> List[str]:
        """Generate high-level tactical recovery recommendations."""
        pass
