import json
import logging
from typing import Dict, Any, List
import httpx
from app.core.config import settings
from app.services.ai.base import BaseAIService
from app.services.ai.mock_ai_service import MockAIService
from app.schemas.recovery import DiagnosisResult

logger = logging.getLogger("recoverai.openai")


class OpenAIService(BaseAIService):
    """
    OpenAI-backed AI Service. Uses OpenAI API if configured, with graceful
    fallback to MockAIService if the API request fails or is rate limited.
    """

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL or "gpt-4o-mini"
        self.fallback = MockAIService()

    def diagnose_root_cause(
        self,
        transaction_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        history_data: Dict[str, Any],
    ) -> DiagnosisResult:
        if not self.api_key:
            return self.fallback.diagnose_root_cause(transaction_data, customer_data, history_data)

        prompt = f"""
You are an expert Autonomous Revenue Recovery AI agent for Razorpay.
Analyze this payment failure and provide a structured JSON diagnosis:
Transaction Data: {json.dumps(transaction_data)}
Customer Data: {json.dumps(customer_data)}
History Data: {json.dumps(history_data)}

Respond ONLY with a JSON object in this exact schema:
{{
  "root_cause": "brief root cause summary",
  "explanation": "concise explanation based on data",
  "recommended_action": "one of: PAYMENT_RETRY, PAYMENT_RECOVERY_LINK, CUSTOMER_REMINDER, SUBSCRIPTION_RECOVERY, INVOICE_REMINDER, ESCALATE, STOP",
  "confidence_score": 88.5,
  "factors": ["factor 1", "factor 2"]
}}
"""
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are a financial revenue recovery AI agent. Output JSON only."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.2,
                        "response_format": {"type": "json_object"},
                    },
                )
                if response.status_code == 200:
                    content = response.json()["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return DiagnosisResult(
                        root_cause=parsed.get("root_cause", "Payment failure"),
                        explanation=parsed.get("explanation", "Diagnosed by OpenAI"),
                        recommended_action=parsed.get("recommended_action", "PAYMENT_RECOVERY_LINK"),
                        confidence_score=float(parsed.get("confidence_score", 85.0)),
                        factors=parsed.get("factors", []),
                    )
                else:
                    logger.warning("OpenAI API returned %s, falling back to rule engine.", response.status_code)
                    return self.fallback.diagnose_root_cause(transaction_data, customer_data, history_data)
        except Exception as e:
            logger.warning("OpenAI API call failed: %s, using deterministic fallback", e)
            return self.fallback.diagnose_root_cause(transaction_data, customer_data, history_data)

    def generate_case_explanation(
        self,
        decision: str,
        transaction_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        score_data: Dict[str, Any],
    ) -> str:
        # For audit consistency, generate deterministic explainable text or fallback
        return self.fallback.generate_case_explanation(decision, transaction_data, customer_data, score_data)

    def generate_executive_insights(
        self,
        metrics_data: Dict[str, Any],
        top_leak_categories: List[Dict[str, Any]],
    ) -> List[str]:
        if not self.api_key:
            return self.fallback.generate_executive_insights(metrics_data, top_leak_categories)

        prompt = f"""
Given the following revenue recovery metrics, produce 3 concise executive recommendations (list of strings):
Metrics: {json.dumps(metrics_data)}
Top Leak Categories: {json.dumps(top_leak_categories)}
Never invent monetary figures not present in the data. Return a JSON array of strings: ["rec1", "rec2", "rec3"].
"""
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are a financial analyst. Return JSON array only."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.2,
                    },
                )
                if response.status_code == 200:
                    content = response.json()["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    if isinstance(parsed, list):
                        return [str(x) for x in parsed]
                    elif isinstance(parsed, dict) and "recommendations" in parsed:
                        return [str(x) for x in parsed["recommendations"]]
        except Exception as e:
            logger.warning("OpenAI insights call failed: %s", e)

        return self.fallback.generate_executive_insights(metrics_data, top_leak_categories)
