from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.models.transaction import Transaction
from app.schemas.common import ResponseEnvelope
from app.schemas.transaction import TransactionRead

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=ResponseEnvelope[List[TransactionRead]])
def list_transactions(
    status_filter: Optional[str] = Query(None, alias="status"),
    transaction_type: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(Transaction.merchant_id == merchant_id)

    if status_filter:
        query = query.filter(Transaction.status == status_filter.upper())
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type.upper())
    if payment_method:
        query = query.filter(Transaction.payment_method == payment_method.upper())
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.external_transaction_id.ilike(search_pattern),
                Transaction.order_id.ilike(search_pattern),
                Transaction.failure_reason.ilike(search_pattern),
            )
        )

    transactions = query.order_by(Transaction.occurred_at.desc()).offset(skip).limit(limit).all()

    return ResponseEnvelope(
        success=True,
        data=transactions,
        message=f"Retrieved {len(transactions)} transactions.",
    )


@router.get("/{transaction_id}", response_model=ResponseEnvelope[TransactionRead])
def get_transaction(
    transaction_id: str,
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.merchant_id == merchant_id)
        .first()
    )
    if not txn:
        # Check by external_transaction_id as well
        txn = (
            db.query(Transaction)
            .filter(Transaction.external_transaction_id == transaction_id, Transaction.merchant_id == merchant_id)
            .first()
        )

    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction '{transaction_id}' not found.",
        )

    return ResponseEnvelope(
        success=True,
        data=txn,
        message="Transaction details retrieved.",
    )
