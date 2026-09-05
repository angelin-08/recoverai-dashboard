import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from app.schemas.transaction import TransactionRead


class RecoveryActionBase(BaseModel):
    action_type: str
    attempt_number: int
    amount: float
    status: str
    reason: Optional[str] = None
    result_message: Optional[str] = None


class RecoveryActionRead(RecoveryActionBase):
    id: str
    recovery_case_id: str
    executed_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class RecoveryCaseBase(BaseModel):
    transaction_id: str
    revenue_at_risk: float
    estimated_recoverable_amount: float
    recovery_probability: float
    priority_score: float
    root_cause: str
    recommended_action: str
    confidence_score: float
    status: str


class RecoveryCaseRead(RecoveryCaseBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    transaction: Optional[TransactionRead] = None
    recovery_actions: List[RecoveryActionRead] = []

    model_config = {"from_attributes": True}


class RecoveryOpportunitySummary(BaseModel):
    total_revenue_at_risk: float
    estimated_recoverable_revenue: float
    expected_recovery_value: float
    total_cases: int
    actionable_opportunities: int


class DiagnosisResult(BaseModel):
    root_cause: str
    explanation: str
    recommended_action: str
    confidence_score: float
    factors: List[str] = []


class ScoringResult(BaseModel):
    recovery_probability: float
    confidence_score: float
    contributing_factors: List[str]
    expected_recovery_value: float


class PriorityResult(BaseModel):
    priority_score: float
    priority_level: str  # HIGH, MEDIUM, LOW
    urgency_reason: str


class GuardrailEvaluation(BaseModel):
    allowed: bool
    requires_approval: bool
    rule_triggered: Optional[str] = None
    reason: str


class AnalysisResponse(BaseModel):
    case_id: str
    transaction_id: str
    diagnosis: DiagnosisResult
    scoring: ScoringResult
    priority: PriorityResult
    guardrail: GuardrailEvaluation
    recommended_action: str
    status: str


class ApprovalDecisionRequest(BaseModel):
    notes: Optional[str] = None
    reviewer: str = "Merchant Admin"


class ExecutionRequest(BaseModel):
    force_override: bool = False
    custom_action: Optional[str] = None


class ExecutionResult(BaseModel):
    case_id: str
    action_type: str
    attempt_number: int
    status: str
    result_message: str
    mode: str  # DEMO or RAZORPAY_TEST
    amount_recovered: float = 0.0
    guardrail_decision: Optional[GuardrailEvaluation] = None
    details: Optional[Dict[str, Any]] = None
