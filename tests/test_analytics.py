def test_dashboard_summary_metrics(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    summary = data["data"]
    assert summary["total_transactions"] >= 250
    assert summary["failed_transactions"] > 0
    assert summary["total_revenue_at_risk"] > 0
    assert summary["average_recovery_probability"] > 0


def test_recovery_trend(client):
    response = client.get("/api/dashboard/recovery-trend?days=14")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)


def test_leak_breakdown(client):
    response = client.get("/api/dashboard/leak-breakdown")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


def test_insights(client):
    response = client.get("/api/insights")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    insights = data["data"]
    assert "largest_revenue_leak_category" in insights
    assert len(insights["ai_recommendations"]) > 0
