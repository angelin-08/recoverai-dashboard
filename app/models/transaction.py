import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.utils.helpers import utcnow


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(64), primary_key=True, default=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    merchant_id = Column(String(64), ForeignKey("merchants.id"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id"), nullable=False, index=True)
    external_transaction_id = Column(String(128), unique=True, nullable=False, index=True)
    order_id = Column(String(128), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    payment_method = Column(String(64), nullable=False)
    transaction_type = Column(String(64), nullable=False)
    status = Column(String(64), nullable=False, index=True)
    failure_reason = Column(String(255), nullable=True)
    failure_category = Column(String(128), nullable=True)
    occurred_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    merchant = relationship("Merchant", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    recovery_case = relationship("RecoveryCase", back_populates="transaction", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="transaction", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_txn_status_occurred", "status", "occurred_at"),
    )
