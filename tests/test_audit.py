def test_audit_logs_retrieval(client):
    response = client.get("/api/audit")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


def test_transaction_audit_timeline(client):
    response = client.get("/api/audit/TXN-SCENARIO-A")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    events = data["data"]
    assert len(events) >= 1
    assert any(e["event_type"] == "REVENUE_DETECTED" for e in events)
