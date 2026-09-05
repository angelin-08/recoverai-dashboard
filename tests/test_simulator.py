def test_what_if_simulator(client):
    payload = {
        "recovery_window_hours": 72,
        "max_automated_attempts": 3,
        "minimum_recovery_probability": 40.0,
    }
    response = client.post("/api/simulator", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    res = data["data"]
    assert res["label"] == "SIMULATION"
    assert res["current_expected_recovery"] > 0
    assert res["simulated_expected_recovery"] > 0
    assert "assumptions" in res
    assert len(res["assumptions"]) > 0
