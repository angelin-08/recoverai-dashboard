from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.schemas.common import ResponseEnvelope
from app.schemas.simulator import SimulationRequest, SimulationResponse
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/simulator", tags=["What-If Simulator"])


@router.post("", response_model=ResponseEnvelope[SimulationResponse])
def run_simulation(
    payload: SimulationRequest,
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    simulator = SimulationService(db)
    result = simulator.run_simulation(merchant_id=merchant_id, request=payload)
    return ResponseEnvelope(
        success=True,
        data=result,
        message="What-if recovery simulation completed successfully without altering live data.",
    )
