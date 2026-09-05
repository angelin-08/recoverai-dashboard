from app.services.guardrail_service import GuardrailService
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.utils.helpers import utcnow


def test_guardrail_successful_transaction_blocked():
    guard = GuardrailService()
    txn = Transaction(
        id="t_success",
        amount=1000.0,
        status="SUCCESS",
        occurred_at=utcnow(),
    )
    res = guard.evaluate_case(transaction=txn)
    assert res.allowed is False
    assert res.rule_triggered == "RULE_TERMINAL_SUCCESS"


def test_guardrail_already_recovered_case_blocked():
    guard = GuardrailService()
    txn = Transaction(id="t_rec", amount=1000.0, status="RECOVERED", occurred_at=utcnow())
    case = RecoveryCase(id="rc_rec", transaction_id="t_rec", status="RECOVERED")
    res = guard.evaluate_case(transaction=txn, recovery_case=case)
    assert res.allowed is False


def test_guardrail_high_value_requires_approval():
    guard = GuardrailService(human_approval_threshold=10000.0)
    txn = Transaction(id="t_high", amount=25000.0, status="FAILED", occurred_at=utcnow())
    case = RecoveryCase(id="rc_high", transaction_id="t_high", status="DETECTED", recovery_actions=[])
    res = guard.evaluate_case(transaction=txn, recovery_case=case)
    assert res.requires_approval is True
    assert res.rule_triggered == "RULE_HIGH_VALUE_THRESHOLD"


def test_guardrail_high_value_allowed_after_approval():
    guard = GuardrailService(human_approval_threshold=10000.0)
    txn = Transaction(id="t_high", amount=25000.0, status="FAILED", occurred_at=utcnow())
    case = RecoveryCase(id="rc_high", transaction_id="t_high", status="APPROVED", recovery_actions=[])
    res = guard.evaluate_case(transaction=txn, recovery_case=case)
    assert res.allowed is True
    assert res.requires_approval is False


def test_guardrail_low_confidence_requires_approval():
    guard = GuardrailService(min_confidence_threshold=70.0)
    txn = Transaction(id="t_low", amount=2000.0, status="FAILED", occurred_at=utcnow())
    case = RecoveryCase(id="rc_low", transaction_id="t_low", status="DETECTED", recovery_actions=[])
    res = guard.evaluate_case(transaction=txn, recovery_case=case, confidence_score=55.0)
    assert res.requires_approval is True
    assert res.rule_triggered == "RULE_LOW_CONFIDENCE_THRESHOLD"


def test_guardrail_max_attempts_exceeded():
    guard = GuardrailService(max_automated_attempts=2)
    txn = Transaction(id="t_fail", amount=2000.0, status="FAILED", occurred_at=utcnow())
    case = RecoveryCase(id="rc_fail", transaction_id="t_fail", status="FAILED")
    case.recovery_actions = [
        RecoveryAction(id="a1", status="FAILED", attempt_number=1, action_type="PAYMENT_RETRY", amount=2000.0),
        RecoveryAction(id="a2", status="FAILED", attempt_number=2, action_type="PAYMENT_RETRY", amount=2000.0),
    ]
    res = guard.evaluate_case(transaction=txn, recovery_case=case, attempt_number=3)
    assert res.allowed is False
    assert res.rule_triggered == "RULE_MAX_ATTEMPTS_EXCEEDED"
