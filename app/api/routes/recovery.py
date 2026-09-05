from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.common import ResponseEnvelope
from app.schemas.recovery import (
    RecoveryCaseRead,
    AnalysisResponse,
    ApprovalDecisionRequest,
    ExecutionRequest,
    ExecutionResult,
)
from app.services.recovery_agent import RecoveryAgent
from app.utils.validators import CaseNotFoundError

router = APIRouter(prefix="/recovery", tags=["Recovery Operations"])


@router.get("", response_model=ResponseEnvelope[List[RecoveryCaseRead]])
def list_recovery_cases(
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
        message=f"Retrieved {len(cases)} recovery cases.",
    )


@router.get("/{case_id}", response_model=ResponseEnvelope[RecoveryCaseRead])
def get_recovery_case(
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
        raise CaseNotFoundError(f"Recovery case '{case_id}' not found.")
    return ResponseEnvelope(
        success=True,
        data=case,
        message="Recovery case retrieved.",
    )


@router.post("/{case_id}/analyze", response_model=ResponseEnvelope[AnalysisResponse])
def analyze_case(
    case_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    agent = RecoveryAgent(db)
    analysis = agent.analyze_case(case_id=case_id)
    return ResponseEnvelope(
        success=True,
        data=analysis,
        message="Autonomous AI recovery analysis completed.",
    )


@router.post("/{case_id}/approve", response_model=ResponseEnvelope[RecoveryCaseRead])
def approve_case(
    case_id: str,
    payload: ApprovalDecisionRequest = ApprovalDecisionRequest(),
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    agent = RecoveryAgent(db)
    case = agent.approve_case(
        case_id=case_id,
        notes=payload.notes,
        reviewer=payload.reviewer,
    )
    return ResponseEnvelope(
        success=True,
        data=case,
        message="Recovery case approved for execution.",
    )


@router.post("/{case_id}/reject", response_model=ResponseEnvelope[RecoveryCaseRead])
def reject_case(
    case_id: str,
    payload: ApprovalDecisionRequest = ApprovalDecisionRequest(),
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    agent = RecoveryAgent(db)
    case = agent.reject_case(
        case_id=case_id,
        notes=payload.notes,
        reviewer=payload.reviewer,
    )
    return ResponseEnvelope(
        success=True,
        data=case,
        message="Recovery case rejected and stopped.",
    )


@router.post("/{case_id}/execute", response_model=ResponseEnvelope[ExecutionResult])
def execute_recovery(
    case_id: str,
    payload: ExecutionRequest = ExecutionRequest(),
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    agent = RecoveryAgent(db)
    result = agent.process_and_execute_case(
        case_id=case_id,
        force_override=payload.force_override,
        custom_action=payload.custom_action,
        actor="MERCHANT_ADMIN" if payload.force_override else "RECOVERY_AGENT",
    )
    return ResponseEnvelope(
        success=True,
        data=result,
        message=f"Executed recovery action: {result.result_message}",
    )
