import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class AuditLogRead(BaseModel):
    id: str
    merchant_id: str
    transaction_id: Optional[str] = None
    recovery_case_id: Optional[str] = None
    event_type: str
    actor: str
    decision: Optional[str] = None
    reason: Optional[str] = None
    action: Optional[str] = None
    result: Optional[str] = None
    metadata_json: Optional[str] = Field(None, alias="metadata_json")
    timestamp: datetime.datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class AuditFilter(BaseModel):
    transaction_id: Optional[str] = None
    recovery_case_id: Optional[str] = None
    event_type: Optional[str] = None
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None
    skip: int = 0
    limit: int = 100
