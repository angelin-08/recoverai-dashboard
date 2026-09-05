def test_scan_and_detect_risks(client):
    response = client.post("/api/revenue-risk/analyze")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_list_revenue_risk_cases(client):
    response = client.get("/api/revenue-risk")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


def test_revenue_risk_summary(client):
    response = client.get("/api/revenue-risk/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    summary = data["data"]
    assert summary["total_revenue_at_risk"] > 0
    assert summary["estimated_recoverable_revenue"] > 0
    assert summary["expected_recovery_value"] > 0
