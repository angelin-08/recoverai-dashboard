import math
from typing import Tuple


def calculate_expected_recovery_value(revenue_at_risk: float, recovery_probability: float) -> float:
    """
    Computes Expected Recovery Value = revenue_at_risk * (recovery_probability / 100.0)
    """
    if revenue_at_risk <= 0 or recovery_probability <= 0:
        return 0.0
    prob_ratio = min(max(recovery_probability / 100.0, 0.0), 1.0)
    return round(revenue_at_risk * prob_ratio, 2)


def calculate_priority_score(
    amount: float,
    recovery_probability: float,
    customer_success_count: int,
    customer_failure_count: int,
    hours_since_failure: float,
    previous_attempts: int = 0,
) -> Tuple[float, str, str]:
    """
    Computes a transparent 0-100 Priority Score for recovery queue ranking.
    Combines:
      - Amount Weight (35%): Higher amounts have higher priority up to normal business cap
      - Recovery Probability Weight (35%): Higher win-rate gets prioritized
      - Customer Loyalty & History (15%): Repeat good customers prioritized
      - Urgency / Freshness (10%): Newer failures are easiest to recover
      - Penalty (-5% per failed attempt): Deprioritize stuck retries
    Returns: (priority_score, priority_level, urgency_reason)
    """
    # 1. Amount factor (0 - 35)
    # Logarithmic scaling up to 50,000 INR
    normalized_amount = min(max(amount, 100.0), 50000.0)
    amount_score = (math.log(normalized_amount) - math.log(100.0)) / (math.log(50000.0) - math.log(100.0)) * 35.0

    # 2. Probability factor (0 - 35)
    prob_score = (min(max(recovery_probability, 0.0), 100.0) / 100.0) * 35.0

    # 3. Customer loyalty factor (0 - 15)
    total_txns = customer_success_count + customer_failure_count
    if total_txns > 0:
        success_rate = customer_success_count / total_txns
        loyalty_score = (success_rate * 10.0) + min(customer_success_count * 1.0, 5.0)
    else:
        loyalty_score = 7.5  # Neutral for new customer

    # 4. Freshness / Urgency factor (0 - 10)
    # Recoveries within 12 hours are highest urgency
    if hours_since_failure <= 12.0:
        urgency_score = 10.0
        urgency_text = "Failure occurred within last 12 hours (optimal recovery window)"
    elif hours_since_failure <= 24.0:
        urgency_score = 7.5
        urgency_text = "Failure occurred within 24 hours"
    elif hours_since_failure <= 48.0:
        urgency_score = 5.0
        urgency_text = "Approaching end of 48-hour recovery window"
    else:
        urgency_score = 2.0
        urgency_text = "Outside ideal 48-hour recovery window"

    # 5. Penalty for previous failed recovery attempts (-5 per attempt)
    attempt_penalty = previous_attempts * 5.0

    raw_score = amount_score + prob_score + loyalty_score + urgency_score - attempt_penalty
    final_score = round(min(max(raw_score, 0.0), 100.0), 2)

    if final_score >= 70.0:
        level = "HIGH"
    elif final_score >= 40.0:
        level = "MEDIUM"
    else:
        level = "LOW"

    return final_score, level, urgency_text
