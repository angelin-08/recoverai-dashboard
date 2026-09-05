def test_list_transactions(client):
    response = client.get("/api/transactions")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


def test_filter_transactions_by_status(client):
    response = client.get("/api/transactions?status=FAILED")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    for txn in data["data"]:
        assert txn["status"] == "FAILED"


def test_get_single_transaction(client):
    response = client.get("/api/transactions/TXN-SCENARIO-A")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["external_transaction_id"] == "TXN-SCENARIO-A"
    assert data["data"]["amount"] == 3000.0


def test_get_nonexistent_transaction(client):
    response = client.get("/api/transactions/TXN-NONEXISTENT")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
