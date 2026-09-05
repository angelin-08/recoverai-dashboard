from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_transactions: int
    failed_transactions: int
    total_revenue_at_risk: float
    estimated_recoverable_revenue: float
    actual_recovered_revenue: float
    recovery_rate_percentage: float  # (actual_recovered / estimated_recoverable) * 100
    active_recovery_cases: int
    escalated_cases: int
    successful_recoveries: int
    failed_recovery_attempts: int
    average_recovery_probability: float
    average_priority_score: float


class RecoveryTrendPoint(BaseModel):
    date: str
    revenue_at_risk: float
    recovered_revenue: float
    cases_count: int


class LeakBreakdownItem(BaseModel):
    category: str
    amount: float
    percentage: float
    count: int


class InsightsResponse(BaseModel):
    largest_revenue_leak_category: str
    largest_revenue_leak_amount: float
    highest_value_recovery_opportunity: Optional[Dict[str, Any]] = None
    most_common_failure_reason: str
    payment_method_failure_breakdown: List[LeakBreakdownItem]
    recovery_performance_by_category: List[Dict[str, Any]]
    ai_recommendations: List[str]
