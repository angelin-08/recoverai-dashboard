from typing import List, Dict, Any
from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    recovery_window_hours: int = Field(default=48, ge=1, le=168)
    max_automated_attempts: int = Field(default=2, ge=1, le=5)
    minimum_recovery_probability: float = Field(default=50.0, ge=0.0, le=100.0)


class SimulationResponse(BaseModel):
    current_expected_recovery: float
    simulated_expected_recovery: float
    additional_recovery: float
    affected_cases: int
    total_cases_analyzed: int
    assumptions: List[str]
    parameters: Dict[str, Any]
    label: str = "SIMULATION"
