import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.schemas.analytics import (
    DashboardSummary,
    RecoveryTrendPoint,
    LeakBreakdownItem,
    InsightsResponse,
)
from app.services.ai import get_ai_service
from app.utils.helpers import utcnow


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.ai_service = get_ai_service()

    def get_dashboard_summary(self, merchant_id: str) -> DashboardSummary:
        # Transactions stats
        total_txns = self.db.query(func.count(Transaction.id)).filter(Transaction.merchant_id == merchant_id).scalar() or 0
        failed_txns = self.db.query(func.count(Transaction.id)).filter(
            Transaction.merchant_id == merchant_id,
            Transaction.status.in_(["FAILED", "ABANDONED", "OVERDUE", "ESCALATED", "RECOVERED"])
        ).scalar() or 0

        # Recovery cases stats
        cases = (
            self.db.query(RecoveryCase)
            .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
            .filter(Transaction.merchant_id == merchant_id)
            .all()
        )

        total_risk = sum(c.revenue_at_risk for c in cases)
        estimated_recoverable = sum(c.estimated_recoverable_amount for c in cases)

        # Actual recovered from transactions with status = RECOVERED
        recovered_txns = (
            self.db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.merchant_id == merchant_id,
                Transaction.status == "RECOVERED"
            )
            .scalar() or 0.0
        )
        actual_recovered = float(recovered_txns)

        # Recovery rate %
        if estimated_recoverable > 0:
            recovery_rate = (actual_recovered / estimated_recoverable) * 100.0
        elif total_risk > 0:
            recovery_rate = (actual_recovered / total_risk) * 100.0
        else:
            recovery_rate = 0.0
        recovery_rate = round(min(recovery_rate, 100.0), 2)

        active_cases = sum(1 for c in cases if c.status not in ["RECOVERED", "STOPPED"])
        escalated_cases = sum(1 for c in cases if c.status == "ESCALATED")
        successful_recoveries = sum(1 for c in cases if c.status == "RECOVERED")

        # Action failures
        failed_attempts = (
            self.db.query(func.count(RecoveryAction.id))
            .join(RecoveryCase, RecoveryAction.recovery_case_id == RecoveryCase.id)
            .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
            .filter(Transaction.merchant_id == merchant_id, RecoveryAction.status == "FAILED")
            .scalar() or 0
        )

        avg_prob = (sum(c.recovery_probability for c in cases) / len(cases)) if cases else 0.0
        avg_priority = (sum(c.priority_score for c in cases) / len(cases)) if cases else 0.0

        return DashboardSummary(
            total_transactions=total_txns,
            failed_transactions=failed_txns,
            total_revenue_at_risk=round(total_risk, 2),
            estimated_recoverable_revenue=round(estimated_recoverable, 2),
            actual_recovered_revenue=round(actual_recovered, 2),
            recovery_rate_percentage=recovery_rate,
            active_recovery_cases=active_cases,
            escalated_cases=escalated_cases,
            successful_recoveries=successful_recoveries,
            failed_recovery_attempts=failed_attempts,
            average_recovery_probability=round(avg_prob, 1),
            average_priority_score=round(avg_priority, 1),
        )

    def get_recovery_trend(self, merchant_id: str, days: int = 14) -> List[RecoveryTrendPoint]:
        cutoff = utcnow() - datetime.timedelta(days=days)
        transactions = (
            self.db.query(Transaction)
            .filter(
                Transaction.merchant_id == merchant_id,
                Transaction.occurred_at >= cutoff,
            )
            .order_by(Transaction.occurred_at.asc())
            .all()
        )

        trend_dict: Dict[str, Dict[str, Any]] = {}
        for txn in transactions:
            date_str = txn.occurred_at.strftime("%Y-%m-%d")
            if date_str not in trend_dict:
                trend_dict[date_str] = {"risk": 0.0, "recovered": 0.0, "cases": 0}

            if txn.status in ["FAILED", "ABANDONED", "OVERDUE", "RECOVERED", "ESCALATED"]:
                trend_dict[date_str]["risk"] += txn.amount
                trend_dict[date_str]["cases"] += 1
            if txn.status == "RECOVERED":
                trend_dict[date_str]["recovered"] += txn.amount

        points = []
        for date_str in sorted(trend_dict.keys()):
            val = trend_dict[date_str]
            points.append(
                RecoveryTrendPoint(
                    date=date_str,
                    revenue_at_risk=round(val["risk"], 2),
                    recovered_revenue=round(val["recovered"], 2),
                    cases_count=val["cases"],
                )
            )
        return points

    def get_leak_breakdown(self, merchant_id: str) -> List[LeakBreakdownItem]:
        items = (
            self.db.query(
                Transaction.failure_category,
                func.sum(Transaction.amount).label("total_amount"),
                func.count(Transaction.id).label("total_count"),
            )
            .filter(
                Transaction.merchant_id == merchant_id,
                Transaction.status.in_(["FAILED", "ABANDONED", "OVERDUE", "RECOVERED", "ESCALATED"]),
            )
            .group_by(Transaction.failure_category)
            .all()
        )

        total_amount_all = sum(float(it.total_amount or 0.0) for it in items) or 1.0
        breakdown = []
        for it in items:
            cat_name = it.failure_category or "Other Gateway Failures"
            amt = float(it.total_amount or 0.0)
            pct = round((amt / total_amount_all) * 100.0, 1)
            breakdown.append(
                LeakBreakdownItem(
                    category=cat_name,
                    amount=round(amt, 2),
                    percentage=pct,
                    count=int(it.total_count or 0),
                )
            )
        breakdown.sort(key=lambda x: x.amount, reverse=True)
        return breakdown

    def get_revenue_leak_insights(self, merchant_id: str) -> InsightsResponse:
        summary = self.get_dashboard_summary(merchant_id)
        breakdown = self.get_leak_breakdown(merchant_id)

        # Payment method failure breakdown
        pm_items = (
            self.db.query(
                Transaction.payment_method,
                func.sum(Transaction.amount).label("total_amount"),
                func.count(Transaction.id).label("total_count"),
            )
            .filter(
                Transaction.merchant_id == merchant_id,
                Transaction.status.in_(["FAILED", "ABANDONED", "OVERDUE", "RECOVERED", "ESCALATED"]),
            )
            .group_by(Transaction.payment_method)
            .all()
        )
        total_pm_amount = sum(float(it.total_amount or 0.0) for it in pm_items) or 1.0
        pm_breakdown = [
            LeakBreakdownItem(
                category=it.payment_method or "UNKNOWN",
                amount=round(float(it.total_amount or 0.0), 2),
                percentage=round((float(it.total_amount or 0.0) / total_pm_amount) * 100.0, 1),
                count=int(it.total_count or 0),
            )
            for it in pm_items
        ]
        pm_breakdown.sort(key=lambda x: x.amount, reverse=True)

        # Most common failure reason
        common_reason_row = (
            self.db.query(Transaction.failure_reason, func.count(Transaction.id).label("rcount"))
            .filter(Transaction.merchant_id == merchant_id, Transaction.failure_reason.isnot(None))
            .group_by(Transaction.failure_reason)
            .order_by(func.count(Transaction.id).desc())
            .first()
        )
        most_common_reason = common_reason_row[0] if common_reason_row else "Temporary Payment Gateway Failure"

        # Highest value recovery opportunity
        highest_case = (
            self.db.query(RecoveryCase)
            .join(Transaction, RecoveryCase.transaction_id == Transaction.id)
            .filter(
                Transaction.merchant_id == merchant_id,
                RecoveryCase.status.in_(["DETECTED", "ANALYZED", "READY", "APPROVAL_REQUIRED"]),
            )
            .order_by(RecoveryCase.estimated_recoverable_amount.desc())
            .first()
        )

        highest_opp = None
        if highest_case:
            highest_opp = {
                "case_id": highest_case.id,
                "transaction_id": highest_case.transaction_id,
                "customer_name": highest_case.transaction.customer.name,
                "amount": highest_case.revenue_at_risk,
                "recovery_probability": highest_case.recovery_probability,
                "estimated_recoverable": highest_case.estimated_recoverable_amount,
                "recommended_action": highest_case.recommended_action,
                "status": highest_case.status,
            }

        # Category performance
        cat_performance = []
        for b in breakdown:
            cat_performance.append({
                "category": b.category,
                "leak_amount": b.amount,
                "case_count": b.count,
                "share_percentage": b.percentage,
            })

        largest_cat = breakdown[0].category if breakdown else "Payment Gateway Failures"
        largest_amt = breakdown[0].amount if breakdown else 0.0

        ai_recs = self.ai_service.generate_executive_insights(
            metrics_data={
                "total_revenue_at_risk": summary.total_revenue_at_risk,
                "actual_recovered_revenue": summary.actual_recovered_revenue,
                "recovery_rate_percentage": summary.recovery_rate_percentage,
            },
            top_leak_categories=[b.model_dump() for b in breakdown[:3]],
        )

        return InsightsResponse(
            largest_revenue_leak_category=largest_cat,
            largest_revenue_leak_amount=largest_amt,
            highest_value_recovery_opportunity=highest_opp,
            most_common_failure_reason=most_common_reason,
            payment_method_failure_breakdown=pm_breakdown,
            recovery_performance_by_category=cat_performance,
            ai_recommendations=ai_recs,
        )
