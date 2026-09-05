import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.utils.helpers import utcnow


class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(String(64), primary_key=True, default=lambda: f"act_{uuid.uuid4().hex[:12]}")
    recovery_case_id = Column(String(64), ForeignKey("recovery_cases.id"), nullable=False, index=True)
    action_type = Column(String(64), nullable=False)
    attempt_number = Column(Integer, nullable=False, default=1)
    amount = Column(Float, nullable=False)
    status = Column(String(64), nullable=False, default="PENDING")
    reason = Column(String(255), nullable=True)
    result_message = Column(String(512), nullable=True)
    executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    recovery_case = relationship("RecoveryCase", back_populates="recovery_actions")

    __table_args__ = (
        Index("idx_act_case_attempt", "recovery_case_id", "attempt_number"),
    )
