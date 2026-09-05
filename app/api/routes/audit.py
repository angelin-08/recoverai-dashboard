import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.models.transaction import Transaction
from app.schemas.common import ResponseEnvelope
from app.schemas.audit import AuditLogRead
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=ResponseEnvelope[List[AuditLogRead]])
def get_audit_trail(
    transaction_id: Optional[str] = Query(None),
    recovery_case_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start_date: Optional[datetime.datetime] = Query(None),
    end_date: Optional[datetime.datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    audit_svc = AuditService(db)
    actual_txn_id = transaction_id
    if transaction_id:
        txn = db.query(Transaction).filter(
            (Transaction.id == transaction_id) | (Transaction.external_transaction_id == transaction_id),
            Transaction.merchant_id == merchant_id,
        ).first()
        if txn:
            actual_txn_id = txn.id

    logs = audit_svc.get_logs(
        merchant_id=merchant_id,
        transaction_id=actual_txn_id,
        recovery_case_id=recovery_case_id,
        event_type=event_type,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    return ResponseEnvelope(
        success=True,
        data=logs,
        message=f"Retrieved {len(logs)} chronological audit events.",
    )


@router.get("/{transaction_id}", response_model=ResponseEnvelope[List[AuditLogRead]])
def get_transaction_audit_timeline(
    transaction_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    audit_svc = AuditService(db)
    txn = db.query(Transaction).filter(
        (Transaction.id == transaction_id) | (Transaction.external_transaction_id == transaction_id),
        Transaction.merchant_id == merchant_id,
    ).first()

    actual_txn_id = txn.id if txn else transaction_id
    timeline = audit_svc.get_timeline_for_transaction(transaction_id=actual_txn_id)
    if not timeline and not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No audit events found for transaction '{transaction_id}'.",
        )
    return ResponseEnvelope(
        success=True,
        data=timeline,
        message=f"Retrieved complete recovery timeline for transaction '{transaction_id}'.",
    )
