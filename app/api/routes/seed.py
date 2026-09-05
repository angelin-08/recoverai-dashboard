from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.common import ResponseEnvelope
from app.seed.seed_database import seed_database

router = APIRouter(prefix="/seed", tags=["Seed Data"])


@router.post("", response_model=ResponseEnvelope[Dict[str, Any]])
def trigger_seed_database(db: Session = Depends(get_db)):
    summary = seed_database(db=db)
    return ResponseEnvelope(
        success=True,
        data=summary,
        message="Database re-seeded deterministically with realistic synthetic transaction data.",
    )
