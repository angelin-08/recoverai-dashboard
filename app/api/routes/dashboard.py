from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.schemas.common import ResponseEnvelope
from app.schemas.analytics import DashboardSummary, RecoveryTrendPoint, LeakBreakdownItem
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=ResponseEnvelope[DashboardSummary])
def get_dashboard_summary(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    analytics = AnalyticsService(db)
    summary = analytics.get_dashboard_summary(merchant_id=merchant_id)
    return ResponseEnvelope(
        success=True,
        data=summary,
        message="Dashboard summary calculated dynamically.",
    )


@router.get("/recovery-trend", response_model=ResponseEnvelope[List[RecoveryTrendPoint]])
def get_recovery_trend(
    days: int = Query(default=14, ge=1, le=90),
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    analytics = AnalyticsService(db)
    trend = analytics.get_recovery_trend(merchant_id=merchant_id, days=days)
    return ResponseEnvelope(
        success=True,
        data=trend,
        message="Recovery trend timeline retrieved.",
    )


@router.get("/leak-breakdown", response_model=ResponseEnvelope[List[LeakBreakdownItem]])
def get_leak_breakdown(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    analytics = AnalyticsService(db)
    breakdown = analytics.get_leak_breakdown(merchant_id=merchant_id)
    return ResponseEnvelope(
        success=True,
        data=breakdown,
        message="Revenue leakage category breakdown retrieved.",
    )
