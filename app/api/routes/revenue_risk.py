from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.common import ResponseEnvelope
from app.schemas.recovery import RecoveryCaseRead, RecoveryOpportunitySummary
from app.services.revenue_risk_service import RevenueRiskService

router = APIRouter(prefix="/revenue-risk", tags=["Revenue Risk Detection"])


@router.post("/analyze", response_model=ResponseEnvelope[List[RecoveryCaseRead]])
def scan_and_detect_risks(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    risk_service = RevenueRiskService(db)
    new_cases = risk_service.scan_and_detect_risks(merchant_id=merchant_id)
    return ResponseEnvelope(
        success=True,
        data=new_cases,
        message=f"Revenue risk scan completed. {len(new_cases)} new cases detected and queued.",
    )


@router.get("", response_model=ResponseEnvelope[List[RecoveryCaseRead]])
def list_risk_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    query = (
        db.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(Transaction.merchant_id == merchant_id)
    )
    if status_filter:
        query = query.filter(RecoveryCase.status == status_filter.upper())

    cases = query.order_by(RecoveryCase.priority_score.desc()).offset(skip).limit(limit).all()
    return ResponseEnvelope(
        success=True,
        data=cases,
        message=f"Retrieved {len(cases)} revenue risk cases.",
    )


@router.get("/summary", response_model=ResponseEnvelope[RecoveryOpportunitySummary])
def get_opportunity_summary(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    cases = (
        db.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(Transaction.merchant_id == merchant_id)
        .all()
    )

    total_risk = sum(c.revenue_at_risk for c in cases)
    estimated_rec = sum(c.estimated_recoverable_amount for c in cases)
    expected_val = sum(c.revenue_at_risk * (c.recovery_probability / 100.0) for c in cases)
    actionable = sum(1 for c in cases if c.status not in ["RECOVERED", "STOPPED"])

    return ResponseEnvelope(
        success=True,
        data=RecoveryOpportunitySummary(
            total_revenue_at_risk=round(total_risk, 2),
            estimated_recoverable_revenue=round(estimated_rec, 2),
            expected_recovery_value=round(expected_val, 2),
            total_cases=len(cases),
            actionable_opportunities=actionable,
        ),
        message="Opportunity summary computed.",
    )


@router.get("/{case_id}", response_model=ResponseEnvelope[RecoveryCaseRead])
def get_risk_case(
    case_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    case = (
        db.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(RecoveryCase.id == case_id, Transaction.merchant_id == merchant_id)
        .first()
    )
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery case '{case_id}' not found.",
        )
    return ResponseEnvelope(
        success=True,
        data=case,
        message="Recovery case retrieved.",
    )
