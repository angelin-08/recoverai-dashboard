import math
from typing import List, Tuple
from app.models.transaction import Transaction
from app.models.customer import Customer
from app.schemas.recovery import ScoringResult
from app.utils.helpers import get_hours_difference
from app.utils.scoring import calculate_expected_recovery_value


class RecoveryScoringService:
    """
    Transparent, explainable recovery probability model.
    Evaluates customer credibility, failure type recoverability, transaction amount,
    channel reliability, freshness of failure, and prior attempt history.
    """

    def calculate_score(
        self,
        transaction: Transaction,
        customer: Customer,
        previous_attempts: int = 0,
    ) -> ScoringResult:
        factors: List[str] = []
        base_log_odds = 0.5  # Baseline prior log odds (~62% probability)

        # 1. Customer track record factor
        successes = customer.total_successful_transactions
        failures = customer.total_failed_transactions
        if successes > 0:
            if successes >= 5:
                base_log_odds += 0.8
                factors.append(f"Highly loyal customer with {successes} successful prior transactions (+20%)")
            else:
                base_log_odds += 0.4
                factors.append(f"Customer has {successes} previous successful transaction(s) (+10%)")
        else:
            base_log_odds -= 0.2
            factors.append("First-time customer with no prior successful history (-5%)")

        if failures > 2:
            base_log_odds -= 0.9
            factors.append(f"Customer has high repeat failure count ({failures} failures) (-25%)")
        elif failures == 1:
            factors.append("Only one previous payment failure on record (minimal impact)")

        # 2. Failure Category / Reason factor
        reason = str(transaction.failure_reason or "").upper()
        if "NETWORK" in reason or "TEMPORARY" in reason:
            base_log_odds += 0.9
            factors.append("Temporary network/gateway glitch has high self-recovery rate (+25%)")
        elif "FUNDS" in reason:
            base_log_odds += 0.2
            factors.append("Insufficient funds is moderately recoverable upon customer alert (+5%)")
        elif "ABANDONED" in reason or transaction.status == "ABANDONED":
            base_log_odds += 0.4
            factors.append("Checkout abandonment is highly receptive to discount/reminder link (+12%)")
        elif "EXPIRED" in reason or "DECLINED" in reason:
            base_log_odds -= 0.3
            factors.append("Issuer decline requires customer to provide new card/account (-10%)")
        elif "SUBSCRIPTION" in reason:
            base_log_odds += 0.3
            factors.append("Subscription mandate failure has standard dunning recovery window (+8%)")

        # 3. Transaction Amount factor
        amount = transaction.amount
        if amount <= 2000:
            base_log_odds += 0.3
            factors.append("Low transaction amount (≤ ₹2,000) shows higher instant authorization rate (+8%)")
        elif amount > 20000:
            base_log_odds -= 0.5
            factors.append("High transaction value (> ₹20,000) has stricter bank fraud/limit checks (-15%)")

        # 4. Payment Method factor
        method = str(transaction.payment_method or "").upper()
        if method == "UPI":
            base_log_odds += 0.3
            factors.append("UPI payment method allows instant retry on mobile apps (+8%)")
        elif method == "NETBANKING":
            base_log_odds -= 0.1
            factors.append("Netbanking session timeouts are frequent (-3%)")
        elif method == "MANDATE":
            base_log_odds += 0.2
            factors.append("Recurring e-mandates have scheduled auto-debit windows (+5%)")

        # 5. Time since failure (Freshness)
        hours_elapsed = get_hours_difference(transaction.occurred_at)
        if hours_elapsed <= 6.0:
            base_log_odds += 0.5
            factors.append("Failure occurred within the last 6 hours (peak customer responsiveness) (+15%)")
        elif hours_elapsed > 48.0:
            base_log_odds -= 0.7
            factors.append("Failure occurred over 48 hours ago (cold recovery window) (-20%)")

        # 6. Previous recovery attempt penalty
        if previous_attempts > 0:
            base_log_odds -= (previous_attempts * 0.6)
            factors.append(f"{previous_attempts} previous automated recovery attempt(s) failed (-{previous_attempts * 15}%)")

        # Calibrate log-odds to 0-100 probability using Logistic Sigmoid
        # Sigmoid: 1 / (1 + exp(-x))
        prob = 1.0 / (1.0 + math.exp(-base_log_odds))
        probability_percentage = round(min(max(prob * 100.0, 5.0), 98.0), 1)

        # Confidence score based on data completeness
        confidence = 90.0
        if successes == 0 and failures == 0:
            confidence -= 15.0  # Less history known
        if hours_elapsed > 72.0:
            confidence -= 10.0
        confidence = round(min(max(confidence, 50.0), 99.0), 1)

        expected_val = calculate_expected_recovery_value(transaction.amount, probability_percentage)

        return ScoringResult(
            recovery_probability=probability_percentage,
            confidence_score=confidence,
            contributing_factors=factors,
            expected_recovery_value=expected_val,
        )
