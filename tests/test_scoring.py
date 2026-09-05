import datetime
from app.services.recovery_scoring_service import RecoveryScoringService
from app.models.transaction import Transaction
from app.models.customer import Customer
from app.utils.scoring import calculate_priority_score, calculate_expected_recovery_value
from app.utils.helpers import utcnow


def test_scoring_probability_and_factors():
    scoring_svc = RecoveryScoringService()
    txn = Transaction(
        id="t1",
        amount=3000.0,
        currency="INR",
        payment_method="UPI",
        transaction_type="PAYMENT",
        status="FAILED",
        failure_reason="TEMPORARY_PAYMENT_FAILURE",
        occurred_at=utcnow() - datetime.timedelta(hours=2),
    )
    cust = Customer(
        id="c1",
        merchant_id="m1",
        name="Priya Nair",
        email="priya@test.com",
        phone="+919876543210",
        total_successful_transactions=5,
        total_failed_transactions=1,
    )
    res = scoring_svc.calculate_score(txn, cust)
    assert 0 <= res.recovery_probability <= 100
    assert res.recovery_probability > 70
    assert len(res.contributing_factors) > 0
    assert res.expected_recovery_value > 0


def test_expected_recovery_calculation():
    val = calculate_expected_recovery_value(5000.0, 80.0)
    assert val == 4000.0


def test_priority_score_ranking():
    score, level, reason = calculate_priority_score(
        amount=25000.0,
        recovery_probability=85.0,
        customer_success_count=4,
        customer_failure_count=0,
        hours_since_failure=3.0,
    )
    assert 0 <= score <= 100
    assert level == "HIGH"
    assert "last 12 hours" in reason
