from app.models.recovery_case import RecoveryCase
from app.models.transaction import Transaction


def test_agent_analyze_and_execute_flow(client, db_session):
    # Find a standard failure case
    case = (
        db_session.query(RecoveryCase)
        .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
        .filter(Transaction.external_transaction_id == "TXN-SCENARIO-A")
        .first()
    )
    assert case is not None

    # 1. Analyze
    analyze_resp = client.post(f"/api/recovery/{case.id}/analyze")
    assert analyze_resp.status_code == 200
    data = analyze_resp.json()["data"]
    assert data["case_id"] == case.id
    assert "diagnosis" in data
    assert "scoring" in data
    assert "guardrail" in data

    # 2. Execute
    exec_resp = client.post(f"/api/recovery/{case.id}/execute", json={"custom_action": "PAYMENT_RECOVERY_LINK"})
    assert exec_resp.status_code == 200
    exec_data = exec_resp.json()["data"]
    assert exec_data["status"] == "RECOVERED"
    assert exec_data["amount_recovered"] == 3000.0

    # 3. Verify terminal lock: Cannot execute on already recovered case
    fail_exec = client.post(f"/api/recovery/{case.id}/execute", json={})
    assert fail_exec.status_code == 400
