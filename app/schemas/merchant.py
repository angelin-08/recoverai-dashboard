import datetime
from pydantic import BaseModel, EmailStr


class MerchantBase(BaseModel):
    name: str
    email: EmailStr


class MerchantCreate(MerchantBase):
    pass


class MerchantRead(MerchantBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}
