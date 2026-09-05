import datetime
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, default=lambda: f"aud_{uuid.uuid4().hex[:12]}")
    merchant_id = Column(String(64), ForeignKey("merchants.id"), nullable=False, index=True)
    transaction_id = Column(String(64), ForeignKey("transactions.id"), nullable=True, index=True)
    recovery_case_id = Column(String(64), ForeignKey("recovery_cases.id"), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    actor = Column(String(64), nullable=False, default="SYSTEM")
    decision = Column(String(128), nullable=True)
    reason = Column(Text, nullable=True)
    action = Column(String(128), nullable=True)
    result = Column(String(128), nullable=True)
    metadata_json = Column("metadata_json", Text, nullable=True)
    timestamp = Column(DateTime, default=utcnow, nullable=False, index=True)

    merchant = relationship("Merchant", back_populates="audit_logs")
    transaction = relationship("Transaction", back_populates="audit_logs")
    recovery_case = relationship("RecoveryCase", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_txn_timestamp", "transaction_id", "timestamp"),
        Index("idx_audit_case_timestamp", "recovery_case_id", "timestamp"),
    )
