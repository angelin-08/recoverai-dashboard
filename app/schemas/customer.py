import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    total_successful_transactions: int = 0
    total_failed_transactions: int = 0
    lifetime_value: float = 0.0


class CustomerCreate(CustomerBase):
    merchant_id: str


class CustomerRead(CustomerBase):
    id: str
    merchant_id: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
