from app.services.diagnosis_service import DiagnosisService
from app.models.transaction import Transaction
from app.models.customer import Customer


def test_diagnosis_temporary_network_glitch():
    svc = DiagnosisService()
    txn = Transaction(
        id="t1",
        amount=1500.0,
        currency="INR",
        payment_method="UPI",
        transaction_type="PAYMENT",
        status="FAILED",
        failure_reason="TEMPORARY_PAYMENT_FAILURE",
    )
    cust = Customer(
        id="c1",
        merchant_id="m1",
        name="Test User",
        email="test@test.com",
        phone="+919876543210",
        total_successful_transactions=3,
        total_failed_transactions=0,
    )
    res = svc.diagnose(txn, cust)
    assert res.recommended_action in ["PAYMENT_RETRY", "PAYMENT_RECOVERY_LINK"]
    assert res.confidence_score >= 80.0


def test_diagnosis_checkout_abandonment():
    svc = DiagnosisService()
    txn = Transaction(
        id="t2",
        amount=2500.0,
        currency="INR",
        payment_method="UPI",
        transaction_type="CHECKOUT",
        status="ABANDONED",
        failure_reason="CUSTOMER_ABANDONED_CHECKOUT",
    )
    cust = Customer(
        id="c2",
        merchant_id="m1",
        name="Cart User",
        email="cart@test.com",
        phone="+919876543211",
        total_successful_transactions=1,
        total_failed_transactions=0,
    )
    res = svc.diagnose(txn, cust)
    assert res.recommended_action == "CUSTOMER_REMINDER"


def test_diagnosis_repeated_failures_escalate():
    svc = DiagnosisService()
    txn = Transaction(
        id="t3",
        amount=3500.0,
        currency="INR",
        payment_method="CARD",
        transaction_type="PAYMENT",
        status="FAILED",
        failure_reason="PAYMENT_METHOD_DECLINED",
    )
    cust = Customer(
        id="c3",
        merchant_id="m1",
        name="Churn Risk User",
        email="churn@test.com",
        phone="+919876543212",
        total_successful_transactions=0,
        total_failed_transactions=4,
    )
    res = svc.diagnose(txn, cust)
    assert res.recommended_action == "ESCALATE"
    assert "Repeated" in res.root_cause
