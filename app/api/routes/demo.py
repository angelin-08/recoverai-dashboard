from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_merchant_id
from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction
from app.schemas.common import ResponseEnvelope
from app.schemas.recovery import ExecutionResult
from app.services.recovery_agent import RecoveryAgent
from app.services.audit_service import AuditService
from app.utils.validators import validate_state_transition

router = APIRouter(prefix="/demo", tags=["Demo & Scenarios"])


@router.get("/scenarios", response_model=ResponseEnvelope[List[Dict[str, Any]]])
def list_demo_scenarios(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    """
    Returns the three pitch demo scenarios pre-configured in the synthetic dataset.
    """
    cases = (
        db.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(Transaction.merchant_id == merchant_id)
        .all()
    )

    case_a = next((c for c in cases if "TXN-SCENARIO-A" in c.transaction.external_transaction_id), None)
    case_b = next((c for c in cases if "TXN-SCENARIO-B" in c.transaction.external_transaction_id), None)
    case_c = next((c for c in cases if "TXN-FAIL-001" in c.transaction.external_transaction_id or "TXN-SCENARIO-C" in c.transaction.external_transaction_id), None)

    scenarios = [
        {
            "scenario": "Scenario A — Autonomous High-Probability Recovery",
            "customer": "Priya Nair",
            "amount": 3000.0,
            "external_id": "TXN-SCENARIO-A",
            "case_id": case_a.id if case_a else None,
            "status": case_a.status if case_a else "UNKNOWN",
            "action": "PAYMENT_RECOVERY_LINK",
            "description": "Transient gateway glitch for loyal customer. Autonomous agent generates Razorpay recovery link with immediate recovery.",
        },
        {
            "scenario": "Scenario B — High-Value Human Approval Guardrail",
            "customer": "Arjun Kumar",
            "amount": 25000.0,
            "external_id": "TXN-SCENARIO-B",
            "case_id": case_b.id if case_b else None,
            "status": case_b.status if case_b else "UNKNOWN",
            "action": "APPROVAL_REQUIRED",
            "description": "High-value transaction exceeding ₹10,000 safety threshold. AI safely stages case for Merchant Admin sign-off.",
        },
        {
            "scenario": "Scenario C — Deterministic Safe Failure & Guardrail Stop",
            "customer": "Meera Thomas",
            "amount": 4999.0,
            "external_id": "TXN-FAIL-001",
            "case_id": case_c.id if case_c else None,
            "status": case_c.status if case_c else "UNKNOWN",
            "action": "STOPPED (Max Attempts)",
            "description": "Persistent insufficient funds. Agent retries safely up to MAX_AUTOMATED_ATTEMPTS (2) and permanently stops further retries.",
        },
    ]

    return ResponseEnvelope(
        success=True,
        data=scenarios,
        message="Demo scenarios loaded.",
    )


@router.post("/run-recovery", response_model=ResponseEnvelope[ExecutionResult])
def run_scenario_a_recovery(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    """
    Executes Scenario A (Priya Nair - ₹3,000 recovery).
    """
    agent = RecoveryAgent(db)
    case = (
        db.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(
            Transaction.merchant_id == merchant_id,
            Transaction.external_transaction_id == "TXN-SCENARIO-A",
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario A transaction not found in database. Run POST /api/seed first.",
        )

    # Analyze then execute
    agent.analyze_case(case.id)
    exec_res = agent.process_and_execute_case(
        case_id=case.id,
        custom_action="PAYMENT_RECOVERY_LINK",
        actor="RECOVERY_AGENT",
    )

    return ResponseEnvelope(
        success=True,
        data=exec_res,
        message="Scenario A executed successfully: ₹3,000 recovered via Autonomous Recovery Link.",
    )


@router.post("/run-failure-scenario", response_model=ResponseEnvelope[Dict[str, Any]])
def run_scenario_c_failure(
    merchant_id: str = Depends(get_current_merchant_id),
    db: Session = Depends(get_db),
):
    """
    Executes Scenario C (Meera Thomas - ₹4,999 safe failure sequence).
    Demonstrates Attempt 1 FAILED, Attempt 2 FAILED, Guardrail Triggered -> RECOVERY_STOPPED.
    """
    agent = RecoveryAgent(db)
    case = (
        db.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(
            Transaction.merchant_id == merchant_id,
            Transaction.external_transaction_id.in_(["TXN-FAIL-001", "TXN-SCENARIO-C"]),
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario C transaction not found in database. Run POST /api/seed first.",
        )

    # Move case into IN_PROGRESS for execution
    case.status = "IN_PROGRESS"
    db.commit()

    attempts_log = []

    # Attempt 1
    res1 = agent.execution_service.execute_action(
        recovery_case=case,
        action_type="PAYMENT_RETRY",
        actor="RECOVERY_AGENT",
    )
    attempts_log.append({
        "attempt": 1,
        "action": "PAYMENT_RETRY",
        "status": res1.status,
        "result_message": res1.result_message,
    })

    # Prepare for Attempt 2
    if case.status != "STOPPED":
        case.status = "IN_PROGRESS"
        db.commit()

        # Attempt 2
        res2 = agent.execution_service.execute_action(
            recovery_case=case,
            action_type="PAYMENT_RETRY",
            actor="RECOVERY_AGENT",
        )
        attempts_log.append({
            "attempt": 2,
            "action": "PAYMENT_RETRY",
            "status": res2.status,
            "result_message": res2.result_message,
        })

    # Attempt 3: Guardrail will strictly block this
    guardrail = agent.guardrail_service.evaluate_case(
        transaction=case.transaction,
        recovery_case=case,
        confidence_score=case.confidence_score,
        attempt_number=3,
    )

    return ResponseEnvelope(
        success=True,
        data={
            "case_id": case.id,
            "customer": case.transaction.customer.name,
            "amount": case.transaction.amount,
            "attempts": attempts_log,
            "final_status": case.status,
            "guardrail_rule": guardrail.rule_triggered,
            "guardrail_explanation": guardrail.reason,
            "further_retries_allowed": guardrail.allowed,
        },
        message="Scenario C completed: Recovery safely stopped after 2 failed attempts per safety guardrail.",
    )
