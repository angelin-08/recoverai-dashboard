def test_scenario_a_recovery_endpoint(client):
    response = client.post("/api/demo/run-recovery")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "RECOVERED"
    assert data["data"]["amount_recovered"] == 3000.0


def test_scenario_c_failure_endpoint(client):
    response = client.post("/api/demo/run-failure-scenario")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["final_status"] == "STOPPED"
    assert data["data"]["further_retries_allowed"] is False
    assert len(data["data"]["attempts"]) == 2


def test_list_demo_scenarios_endpoint(client):
    response = client.get("/api/demo/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 3
