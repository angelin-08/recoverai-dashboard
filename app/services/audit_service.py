import json
import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.audit_log import AuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_event(
        self,
        merchant_id: str,
        event_type: str,
        actor: str = "SYSTEM",
        transaction_id: Optional[str] = None,
        recovery_case_id: Optional[str] = None,
        decision: Optional[str] = None,
        reason: Optional[str] = None,
        action: Optional[str] = None,
        result: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Creates an immutable audit log entry.
        """
        meta_str = json.dumps(metadata) if metadata else None
        audit_entry = AuditLog(
            merchant_id=merchant_id,
            transaction_id=transaction_id,
            recovery_case_id=recovery_case_id,
            event_type=event_type,
            actor=actor,
            decision=decision,
            reason=reason,
            action=action,
            result=result,
            metadata_json=meta_str,
            timestamp=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
        )
        self.db.add(audit_entry)
        self.db.commit()
        self.db.refresh(audit_entry)
        return audit_entry

    def get_logs(
        self,
        merchant_id: str,
        transaction_id: Optional[str] = None,
        recovery_case_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start_date: Optional[datetime.datetime] = None,
        end_date: Optional[datetime.datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        query = self.db.query(AuditLog).filter(AuditLog.merchant_id == merchant_id)
        if transaction_id:
            query = query.filter(AuditLog.transaction_id == transaction_id)
        if recovery_case_id:
            query = query.filter(AuditLog.recovery_case_id == recovery_case_id)
        if event_type:
            query = query.filter(AuditLog.event_type == event_type)
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)

        return query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit).all()

    def get_timeline_for_transaction(self, transaction_id: str) -> List[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.transaction_id == transaction_id)
            .order_by(AuditLog.timestamp.asc())
            .all()
        )
