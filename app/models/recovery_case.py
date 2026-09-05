import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.utils.helpers import utcnow


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id = Column(String(64), primary_key=True, default=lambda: f"rc_{uuid.uuid4().hex[:12]}")
    transaction_id = Column(String(64), ForeignKey("transactions.id"), unique=True, nullable=False, index=True)
    revenue_at_risk = Column(Float, nullable=False)
    estimated_recoverable_amount = Column(Float, nullable=False)
    recovery_probability = Column(Float, nullable=False)
    priority_score = Column(Float, nullable=False)
    root_cause = Column(String(255), nullable=False)
    recommended_action = Column(String(64), nullable=False)
    confidence_score = Column(Float, nullable=False)
    status = Column(String(64), nullable=False, default="DETECTED", index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    transaction = relationship("Transaction", back_populates="recovery_case")
    recovery_actions = relationship("RecoveryAction", back_populates="recovery_case", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="recovery_case", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_rc_status_priority", "status", "priority_score"),
    )
