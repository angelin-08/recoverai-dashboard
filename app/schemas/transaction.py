import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.customer import CustomerRead


class TransactionBase(BaseModel):
    external_transaction_id: str
    order_id: Optional[str] = None
    amount: float = Field(gt=0)
    currency: str = "INR"
    payment_method: str
    transaction_type: str
    status: str
    failure_reason: Optional[str] = None
    failure_category: Optional[str] = None
    occurred_at: datetime.datetime


class TransactionCreate(TransactionBase):
    merchant_id: str
    customer_id: str


class TransactionRead(TransactionBase):
    id: str
    merchant_id: str
    customer_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    customer: Optional[CustomerRead] = None

    model_config = {"from_attributes": True}


class TransactionFilter(BaseModel):
    status: Optional[str] = None
    transaction_type: Optional[str] = None
    payment_method: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    search: Optional[str] = None
    skip: int = 0
    limit: int = 50
