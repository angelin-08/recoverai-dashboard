import logging
from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.models.recovery_case import RecoveryCase
from app.models.recovery_action import RecoveryAction
from app.models.audit_log import AuditLog
from app.seed.generate_data import generate_synthetic_dataset
from app.services.revenue_risk_service import RevenueRiskService
from app.utils.helpers import format_currency_inr

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recoverai.seed")


def seed_database(db: Session = None) -> dict:
    close_db_at_end = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db_at_end = True

    try:
        # Clear existing tables cleanly
        db.query(AuditLog).delete()
        db.query(RecoveryAction).delete()
        db.query(RecoveryCase).delete()
        db.query(Transaction).delete()
        db.query(Customer).delete()
        db.query(Merchant).delete()
        db.commit()

        dataset = generate_synthetic_dataset(seed=42)

        # 1. Insert Merchant
        m_data = dataset["merchant"]
        merchant = Merchant(
            id=m_data["id"],
            name=m_data["name"],
            email=m_data["email"],
            created_at=m_data["created_at"],
        )
        db.add(merchant)
        db.commit()

        # 2. Insert Customers
        for c_data in dataset["customers"]:
            customer = Customer(
                id=c_data["id"],
                merchant_id=c_data["merchant_id"],
                name=c_data["name"],
                email=c_data["email"],
                phone=c_data["phone"],
                total_successful_transactions=c_data["total_successful_transactions"],
                total_failed_transactions=c_data["total_failed_transactions"],
                lifetime_value=c_data["lifetime_value"],
                created_at=c_data["created_at"],
            )
            db.add(customer)
        db.commit()

        # 3. Insert Transactions
        for t_data in dataset["transactions"]:
            txn = Transaction(
                id=t_data["id"],
                merchant_id=t_data["merchant_id"],
                customer_id=t_data["customer_id"],
                external_transaction_id=t_data["external_transaction_id"],
                order_id=t_data.get("order_id"),
                amount=t_data["amount"],
                currency=t_data["currency"],
                payment_method=t_data["payment_method"],
                transaction_type=t_data["transaction_type"],
                status=t_data["status"],
                failure_reason=t_data.get("failure_reason"),
                failure_category=t_data.get("failure_category"),
                occurred_at=t_data["occurred_at"],
                created_at=t_data["created_at"],
            )
            db.add(txn)
        db.commit()

        # 4. Run Revenue Risk Detection to create Initial Recovery Cases & Audits
        risk_service = RevenueRiskService(db)
        detected_cases = risk_service.scan_and_detect_risks(merchant_id=merchant.id)

        # Summary statistics
        total_customers = db.query(Customer).count()
        total_txns = db.query(Transaction).count()
        revenue_at_risk = sum(c.revenue_at_risk for c in detected_cases)
        estimated_recoverable = sum(c.estimated_recoverable_amount for c in detected_cases)

        summary = {
            "merchant_id": merchant.id,
            "merchant_name": merchant.name,
            "customers": total_customers,
            "transactions": total_txns,
            "recovery_cases": len(detected_cases),
            "revenue_at_risk": revenue_at_risk,
            "estimated_recoverable": estimated_recoverable,
        }

        print("\n" + "=" * 55)
        print(" RECOVERAI SYNTHETIC DATABASE SEEDING COMPLETED ")
        print("=" * 55)
        print(f"Merchant created      : {merchant.name} ({merchant.id})")
        print(f"Customers             : {total_customers}")
        print(f"Transactions          : {total_txns}")
        print(f"Recovery Cases        : {len(detected_cases)}")
        print(f"Revenue at risk       : {format_currency_inr(revenue_at_risk)}")
        print(f"Estimated recoverable : {format_currency_inr(estimated_recoverable)}")
        print("=" * 55 + "\n")

        return summary

    finally:
        if close_db_at_end:
            db.close()


if __name__ == "__main__":
    # Ensure fresh tables on direct execution
    Base.metadata.create_all(bind=engine)
    seed_database()
