from typing import List
from sqlalchemy.orm import Session
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.simulator import SimulationRequest, SimulationResponse
from app.utils.helpers import get_hours_difference


class SimulationService:
    def __init__(self, db: Session):
        self.db = db

    def run_simulation(self, merchant_id: str, request: SimulationRequest) -> SimulationResponse:
        cases = (
            self.db.query(RecoveryCase)
            .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
            .filter(Transaction.merchant_id == merchant_id)
            .all()
        )

        current_expected_total = sum(c.estimated_recoverable_amount for c in cases)
        simulated_expected_total = 0.0
        affected_count = 0

        assumptions: List[str] = [
            f"Expanded/modified recovery window to {request.recovery_window_hours} hours.",
            f"Set automated retry policy cap to {request.max_automated_attempts} attempts.",
            f"Set minimum recovery probability eligibility threshold to {request.minimum_recovery_probability:.1f}%.",
            "Assumed standard non-linear conversion drop-off on aged dunning links.",
        ]

        for case in cases:
            txn = case.transaction
            hours_elapsed = get_hours_difference(txn.occurred_at)
            prob = case.recovery_probability

            # Baseline calculation for this case
            # Simulate adjustments based on parameters:
            simulated_prob = prob

            # 1. Window adjustment: if currently > 48h but within simulated window, recoverability increases
            if hours_elapsed <= request.recovery_window_hours:
                # If window was extended, add capture boost
                if request.recovery_window_hours > 48:
                    simulated_prob = min(simulated_prob + 8.0, 95.0)
            else:
                # Outside simulated window
                simulated_prob = max(simulated_prob - 25.0, 0.0)

            # 2. Max attempts adjustment
            if request.max_automated_attempts > 2:
                simulated_prob = min(simulated_prob + (request.max_automated_attempts - 2) * 5.0, 95.0)
            elif request.max_automated_attempts < 2:
                simulated_prob = max(simulated_prob - 10.0, 0.0)

            # 3. Minimum threshold filter
            if simulated_prob < request.minimum_recovery_probability:
                simulated_case_value = 0.0
            else:
                simulated_case_value = txn.amount * (simulated_prob / 100.0)

            if round(simulated_case_value, 2) != round(case.estimated_recoverable_amount, 2):
                affected_count += 1

            simulated_expected_total += simulated_case_value

        additional_recovery = simulated_expected_total - current_expected_total

        return SimulationResponse(
            current_expected_recovery=round(current_expected_total, 2),
            simulated_expected_recovery=round(simulated_expected_total, 2),
            additional_recovery=round(additional_recovery, 2),
            affected_cases=affected_count,
            total_cases_analyzed=len(cases),
            assumptions=assumptions,
            parameters=request.model_dump(),
            label="SIMULATION",
        )
