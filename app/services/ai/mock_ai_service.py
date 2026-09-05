from typing import Dict, Any, List
from app.services.ai.base import BaseAIService
from app.schemas.recovery import DiagnosisResult


class MockAIService(BaseAIService):
    """
    Deterministic rule-based AI reasoning engine.
    Ensures complete, reproducible, and explainable diagnosis and recommendation
    without needing an external API key or pretending an API was called.
    """

    def diagnose_root_cause(
        self,
        transaction_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        history_data: Dict[str, Any],
    ) -> DiagnosisResult:
        failure_reason = str(transaction_data.get("failure_reason") or "").upper()
        status = str(transaction_data.get("status") or "").upper()
        txn_type = str(transaction_data.get("transaction_type") or "").upper()
        failed_txns = int(customer_data.get("total_failed_transactions", 0))
        success_txns = int(customer_data.get("total_successful_transactions", 0))
        amount = float(transaction_data.get("amount", 0.0))

        factors = []
        if success_txns > 0:
            factors.append(f"Customer has {success_txns} previous successful transaction(s)")
        if failed_txns > 0:
            factors.append(f"Customer has {failed_txns} previous failure(s)")
        factors.append(f"Transaction type: {txn_type}, Payment Method: {transaction_data.get('payment_method')}")

        # Rule 1: High customer churn / repeated failure history
        if failed_txns >= 3:
            return DiagnosisResult(
                root_cause="Repeated payment failure pattern detected",
                explanation=f"Customer has {failed_txns} lifetime payment failures. Automated retries risk frustrating customer; escalation is advised.",
                recommended_action="ESCALATE",
                confidence_score=94.0,
                factors=factors + ["High repeated failure count (>2) indicates systemic issue"],
            )

        # Rule 2: Checkout Abandonment
        if status == "ABANDONED" or failure_reason == "CUSTOMER_ABANDONED_CHECKOUT" or txn_type == "CHECKOUT":
            return DiagnosisResult(
                root_cause="Checkout abandonment during checkout funnel",
                explanation="Customer initiated checkout but abandoned session before completing payment gateway authentication.",
                recommended_action="CUSTOMER_REMINDER",
                confidence_score=88.0,
                factors=factors + ["Session dropped before completion", "Non-intrusive reminder recommended"],
            )

        # Rule 3: Subscriptions
        if txn_type == "SUBSCRIPTION" or failure_reason == "SUBSCRIPTION_PAYMENT_FAILED":
            return DiagnosisResult(
                root_cause="Subscription recurring payment debit failed",
                explanation="Automated recurring mandate debit failed with bank switch. Smart dunning link provides highest conversion.",
                recommended_action="SUBSCRIPTION_RECOVERY",
                confidence_score=89.0,
                factors=factors + ["Recurring mandate failure", "Alternative payment channel needed"],
            )

        # Rule 4: Overdue Invoices
        if status == "OVERDUE" or txn_type == "INVOICE" or failure_reason == "INVOICE_OVERDUE":
            return DiagnosisResult(
                root_cause="Merchant invoice overdue past payment terms",
                explanation="Invoice unpaid past due date. Structured reminder with direct payment link optimizes collection.",
                recommended_action="INVOICE_REMINDER",
                confidence_score=87.0,
                factors=factors + ["Net terms exceeded", "Automated email/SMS invoice reminder required"],
            )

        # Rule 5: Network / Temporary Switch error
        if "NETWORK" in failure_reason or "TEMPORARY" in failure_reason:
            if amount <= 5000 and success_txns >= 2:
                action = "PAYMENT_RETRY"
                explanation = "Temporary gateway timeout. Strong customer history justifies an immediate automated retry."
            else:
                action = "PAYMENT_RECOVERY_LINK"
                explanation = "Temporary processing failure. Payment recovery link allows seamless customer self-healing."
            return DiagnosisResult(
                root_cause="Temporary payment processing/switch failure",
                explanation=explanation,
                recommended_action=action,
                confidence_score=92.0,
                factors=factors + ["Transient gateway glitch detected"],
            )

        # Rule 6: Insufficient Funds
        if "FUNDS" in failure_reason:
            return DiagnosisResult(
                root_cause="Insufficient funds in customer account",
                explanation="Account balance was insufficient at time of debit. Sending a delayed payment recovery link maximizes success.",
                recommended_action="PAYMENT_RECOVERY_LINK",
                confidence_score=86.0,
                factors=factors + ["Customer needs opportunity to refill account or switch cards"],
            )

        # Rule 7: Expired / Declined
        if "EXPIRED" in failure_reason or "DECLINED" in failure_reason:
            return DiagnosisResult(
                root_cause="Payment method declined or expired by issuing bank",
                explanation="Card or mandate expired or declined by issuer. Payment recovery link allows customer to use alternative method.",
                recommended_action="PAYMENT_RECOVERY_LINK",
                confidence_score=90.0,
                factors=factors + ["Issuer decline requires payment method update"],
            )

        # Default fallback rule
        return DiagnosisResult(
            root_cause="Payment authorization failure",
            explanation="Transaction was rejected by upstream payment aggregator or bank network.",
            recommended_action="PAYMENT_RECOVERY_LINK",
            confidence_score=82.0,
            factors=factors + ["Standard authorization failure"],
        )

    def generate_case_explanation(
        self,
        decision: str,
        transaction_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        score_data: Dict[str, Any],
    ) -> str:
        amount = transaction_data.get("amount", 0.0)
        success_txns = customer_data.get("total_successful_transactions", 0)
        prob = score_data.get("recovery_probability", 0.0)

        if decision == "PAYMENT_RECOVERY_LINK":
            return (
                f"Generated payment recovery link for ₹{amount:,.2f}. The customer has {success_txns} successful prior transaction(s), "
                f"and estimated recovery probability is {prob:.0f}% within the 48-hour window."
            )
        elif decision == "PAYMENT_RETRY":
            return (
                f"Automated retry queued for ₹{amount:,.2f} following a transient network glitch. Customer has trusted payment history."
            )
        elif decision == "CUSTOMER_REMINDER":
            return (
                f"Triggered checkout recovery reminder for ₹{amount:,.2f}. High intent customer identified from cart activity."
            )
        elif decision == "SUBSCRIPTION_RECOVERY":
            return (
                f"Triggered subscription dunning recovery workflow for ₹{amount:,.2f} to prevent involuntary churn."
            )
        elif decision == "INVOICE_REMINDER":
            return (
                f"Dispatched automated invoice reminder for ₹{amount:,.2f} with one-click Razorpay payment link."
            )
        elif decision == "ESCALATE":
            return (
                f"Escalated case for ₹{amount:,.2f} to Merchant Operations due to repeated payment failures or high value."
            )
        return f"Autonomous action '{decision}' executed based on {prob:.0f}% win probability."

    def generate_executive_insights(
        self,
        metrics_data: Dict[str, Any],
        top_leak_categories: List[Dict[str, Any]],
    ) -> List[str]:
        recommendations = []
        at_risk = metrics_data.get("total_revenue_at_risk", 0.0)
        rec_rate = metrics_data.get("recovery_rate_percentage", 0.0)

        if top_leak_categories:
            top = top_leak_categories[0]
            recommendations.append(
                f"Top Revenue Leak: {top.get('category')} accounts for ₹{top.get('amount', 0):,.2f} ({top.get('percentage', 0):.1f}% of total leak). Prioritize automated dunning workflows here."
            )

        if rec_rate < 50.0:
            recommendations.append(
                "Current recovery rate is below 50%. Recommend enabling automated Payment Recovery Links across UPI and Netbanking dropouts."
            )
        else:
            recommendations.append(
                f"Healthy recovery rate of {rec_rate:.1f}%. Increasing automated retry window to 48 hours could unlock further upside."
            )

        recommendations.append(
            "Guardrail Policy in effect: All high-value transactions (>₹10,000) are securely staged for one-click Merchant Admin approval."
        )
        return recommendations
