from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.schemas.common import ResponseEnvelope
from app.schemas.analytics import InsightsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("", response_model=ResponseEnvelope[InsightsResponse])
def get_insights(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    analytics = AnalyticsService(db)
    insights = analytics.get_revenue_leak_insights(merchant_id=merchant_id)
    return ResponseEnvelope(
        success=True,
        data=insights,
        message="AI & statistical revenue leak insights generated.",
    )
