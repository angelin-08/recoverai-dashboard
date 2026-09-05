from typing import Optional
from app.core.config import settings
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.schemas.recovery import GuardrailEvaluation
from app.utils.helpers import get_hours_difference


class GuardrailService:
    def __init__(
        self,
        max_automated_attempts: Optional[int] = None,
        max_automated_amount: Optional[float] = None,
        human_approval_threshold: Optional[float] = None,
        recovery_window_hours: Optional[int] = None,
        min_confidence_threshold: Optional[float] = None,
    ):
        self.max_attempts = max_automated_attempts or settings.MAX_AUTOMATED_ATTEMPTS
        self.max_amount = max_automated_amount or settings.MAX_AUTOMATED_AMOUNT
        self.approval_threshold = human_approval_threshold or settings.HUMAN_APPROVAL_THRESHOLD
        self.window_hours = recovery_window_hours or settings.RECOVERY_WINDOW_HOURS
        self.min_confidence = min_confidence_threshold or settings.MIN_CONFIDENCE_THRESHOLD

    def evaluate_case(
        self,
        transaction: Transaction,
        recovery_case: Optional[RecoveryCase] = None,
        confidence_score: float = 85.0,
        attempt_number: int = 1,
    ) -> GuardrailEvaluation:
        # Rule 1: Never retry or act on already successful/recovered transactions
        if transaction.status in ["SUCCESS", "RECOVERED"]:
            return GuardrailEvaluation(
                allowed=False,
                requires_approval=False,
                rule_triggered="RULE_TERMINAL_SUCCESS",
                reason=f"Transaction is already in '{transaction.status}' state. Automatic retries strictly prohibited.",
            )

        if recovery_case and recovery_case.status == "RECOVERED":
            return GuardrailEvaluation(
                allowed=False,
                requires_approval=False,
                rule_triggered="RULE_ALREADY_RECOVERED",
                reason="Recovery case is already successfully resolved. Further recovery actions are blocked.",
            )

        if recovery_case and recovery_case.status == "STOPPED":
            return GuardrailEvaluation(
                allowed=False,
                requires_approval=False,
                rule_triggered="RULE_CASE_STOPPED",
                reason="Recovery case was permanently stopped by merchant or safety rule.",
            )

        # Rule 2: Attempt Count Guardrail
        if attempt_number > self.max_attempts:
            return GuardrailEvaluation(
                allowed=False,
                requires_approval=False,
                rule_triggered="RULE_MAX_ATTEMPTS_EXCEEDED",
                reason=f"Attempt {attempt_number} exceeds maximum allowed automated attempts ({self.max_attempts}).",
            )

        if recovery_case and len(recovery_case.recovery_actions) >= self.max_attempts:
            # Check if any action is already pending/executed
            executed_attempts = sum(1 for a in recovery_case.recovery_actions if a.status in ["EXECUTED", "COMPLETED", "FAILED"])
            if executed_attempts >= self.max_attempts and recovery_case.status != "APPROVED":
                return GuardrailEvaluation(
                    allowed=False,
                    requires_approval=True,
                    rule_triggered="RULE_MAX_ATTEMPTS_EXCEEDED",
                    reason=f"Maximum automated recovery attempts ({self.max_attempts}) reached without success. Case requires escalation or human review.",
                )

        # Rule 3: High Value Human Approval Threshold
        if transaction.amount > self.approval_threshold:
            # If already explicitly approved by Merchant Admin, allow execution
            if recovery_case and recovery_case.status == "APPROVED":
                return GuardrailEvaluation(
                    allowed=True,
                    requires_approval=False,
                    rule_triggered=None,
                    reason=f"High value transaction (₹{transaction.amount:,.2f}) was explicitly approved by Merchant Admin.",
                )
            return GuardrailEvaluation(
                allowed=False,
                requires_approval=True,
                rule_triggered="RULE_HIGH_VALUE_THRESHOLD",
                reason=f"Transaction value ₹{transaction.amount:,.2f} exceeds automated threshold of ₹{self.approval_threshold:,.2f}. Mandatory human approval required.",
            )

        # Rule 4: Low Confidence Decision Guardrail
        if confidence_score < self.min_confidence:
            if recovery_case and recovery_case.status == "APPROVED":
                return GuardrailEvaluation(
                    allowed=True,
                    requires_approval=False,
                    rule_triggered=None,
                    reason="Low confidence score was reviewed and approved by merchant.",
                )
            return GuardrailEvaluation(
                allowed=False,
                requires_approval=True,
                rule_triggered="RULE_LOW_CONFIDENCE_THRESHOLD",
                reason=f"AI diagnosis confidence score ({confidence_score:.1f}%) is below minimum safety threshold ({self.min_confidence:.1f}%). Requires human review.",
            )

        # Rule 5: Time Window Expiration
        hours_elapsed = get_hours_difference(transaction.occurred_at)
        if hours_elapsed > self.window_hours:
            return GuardrailEvaluation(
                allowed=False,
                requires_approval=True,
                rule_triggered="RULE_OUTSIDE_RECOVERY_WINDOW",
                reason=f"Transaction failure occurred {hours_elapsed:.1f} hours ago, exceeding the {self.window_hours}-hour recovery window.",
            )

        # Rule 6: Duplicate in-flight action prevention
        if recovery_case:
            for action in recovery_case.recovery_actions:
                if action.status == "PENDING":
                    return GuardrailEvaluation(
                        allowed=False,
                        requires_approval=False,
                        rule_triggered="RULE_DUPLICATE_ACTION_IN_FLIGHT",
                        reason=f"A recovery action '{action.action_type}' is already pending execution for this case.",
                    )

        # All guardrails passed
        return GuardrailEvaluation(
            allowed=True,
            requires_approval=False,
            rule_triggered=None,
            reason="All autonomous recovery safety guardrails satisfied.",
        )
