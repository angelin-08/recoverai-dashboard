from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction


def test_human_approval_flow_for_high_value(client, db_session):
    # Find Scenario B (Arjun Kumar - ₹25,000)
    case = (
        db_session.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(Transaction.external_transaction_id == "TXN-SCENARIO-B")
        .first()
    )
    assert case is not None

    # Analyze triggers APPROVAL_REQUIRED because amount > 10,000
    res_analyze = client.post(f"/api/recovery/{case.id}/analyze")
    assert res_analyze.status_code == 200
    assert res_analyze.json()["data"]["status"] == "APPROVAL_REQUIRED"

    # Direct execution should be blocked by guardrails
    res_exec = client.post(f"/api/recovery/{case.id}/execute", json={})
    assert res_exec.status_code == 400
    assert "GUARDRAIL_VIOLATION" in res_exec.json()["error"]["code"]

    # Merchant Admin approves
    res_approve = client.post(f"/api/recovery/{case.id}/approve", json={"notes": "High value customer VIP approval", "reviewer": "Finance Lead"})
    assert res_approve.status_code == 200
    assert res_approve.json()["data"]["status"] == "APPROVED"

    # Now execution is permitted
    res_exec_after = client.post(f"/api/recovery/{case.id}/execute", json={})
    assert res_exec_after.status_code == 200


def test_human_rejection_flow(client, db_session):
    case = (
        db_session.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(Transaction.external_transaction_id == "TXN-SCENARIO-B")
        .first()
    )
    # Move to APPROVAL_REQUIRED
    client.post(f"/api/recovery/{case.id}/analyze")

    # Reject
    res_reject = client.post(f"/api/recovery/{case.id}/reject", json={"notes": "Suspected fraudulent account", "reviewer": "Risk Lead"})
    assert res_reject.status_code == 200
    assert res_reject.json()["data"]["status"] == "STOPPED"
