import random
import datetime
from typing import List, Dict, Any
from app.utils.helpers import utcnow


def generate_synthetic_dataset(seed: int = 42) -> Dict[str, Any]:
    """
    Generates deterministic synthetic transaction dataset for RecoverAI demo/development.
    Guarantees reproducibility and realism.
    """
    rng = random.Random(seed)
    now = utcnow()

    # 1. Demo Merchant
    merchant = {
        "id": "demo-merchant-001",
        "name": "Apex Digital Commerce",
        "email": "payments@apexdigital.io",
        "created_at": datetime.datetime(2025, 1, 1, 10, 0, 0),
    }

    # 2. Customers (105 customers)
    first_names = [
        "Aarav", "Aditi", "Amit", "Ananya", "Arjun", "Bhavna", "Chetan", "Deepak",
        "Divya", "Gaurav", "Harish", "Ishaan", "Kavita", "Karan", "Manish", "Meera",
        "Neha", "Nikhil", "Pooja", "Pranav", "Priya", "Rahul", "Rakesh", "Riya",
        "Rohan", "Sachin", "Sameer", "Sanjay", "Shreya", "Sneha", "Sunil", "Tanvi",
        "Tarun", "Varun", "Vikas", "Vikram", "Yash", "Zoya", "Kiran", "Madhav"
    ]
    last_names = [
        "Sharma", "Verma", "Patel", "Nair", "Kumar", "Singh", "Gupta", "Thomas",
        "Reddy", "Iyer", "Joshi", "Menon", "Chopra", "Das", "Bhat", "Mehta",
        "Shah", "Pillai", "Mishra", "Deshmukh"
    ]

    customers: List[Dict[str, Any]] = []

    # Specific Scenario Customers:
    scenario_customers = [
        {
            "id": "cust_priya_nair",
            "merchant_id": merchant["id"],
            "name": "Priya Nair",
            "email": "priya.nair@example.com",
            "phone": "+919876543210",
            "total_successful_transactions": 6,
            "total_failed_transactions": 1,
            "lifetime_value": 34500.0,
            "created_at": datetime.datetime(2025, 3, 10, 14, 30, 0),
        },
        {
            "id": "cust_arjun_kumar",
            "merchant_id": merchant["id"],
            "name": "Arjun Kumar",
            "email": "arjun.kumar@example.com",
            "phone": "+919812345678",
            "total_successful_transactions": 2,
            "total_failed_transactions": 0,
            "lifetime_value": 45000.0,
            "created_at": datetime.datetime(2025, 4, 1, 9, 0, 0),
        },
        {
            "id": "cust_meera_thomas",
            "merchant_id": merchant["id"],
            "name": "Meera Thomas",
            "email": "meera.thomas@example.com",
            "phone": "+919745678901",
            "total_successful_transactions": 1,
            "total_failed_transactions": 2,
            "lifetime_value": 4999.0,
            "created_at": datetime.datetime(2025, 4, 15, 11, 20, 0),
        }
    ]
    customers.extend(scenario_customers)

    for i in range(4, 106):
        fn = rng.choice(first_names)
        ln = rng.choice(last_names)
        cid = f"cust_{i:04d}"
        cust_created = datetime.datetime(2025, 1, 1) + datetime.timedelta(days=rng.randint(0, 180))
        success_count = rng.choices([0, 1, 2, 3, 4, 7, 12], weights=[15, 25, 25, 15, 10, 7, 3])[0]
        fail_count = rng.choices([0, 1, 2, 3, 4], weights=[40, 35, 15, 7, 3])[0]
        avg_spend = rng.uniform(800.0, 4500.0)

        customers.append({
            "id": cid,
            "merchant_id": merchant["id"],
            "name": f"{fn} {ln}",
            "email": f"{fn.lower()}.{ln.lower()}{i}@example.com",
            "phone": f"+9198{rng.randint(10000000, 99999999)}",
            "total_successful_transactions": success_count,
            "total_failed_transactions": fail_count,
            "lifetime_value": round(success_count * avg_spend, 2),
            "created_at": cust_created,
        })

    # 3. Transactions (260+ transactions)
    transactions: List[Dict[str, Any]] = []

    # Scenario A: Priya Nair - ₹3,000, FAILED
    transactions.append({
        "id": "txn_scenario_a_priya",
        "merchant_id": merchant["id"],
        "customer_id": "cust_priya_nair",
        "external_transaction_id": "TXN-SCENARIO-A",
        "order_id": "order_scen_a_101",
        "amount": 3000.0,
        "currency": "INR",
        "payment_method": "UPI",
        "transaction_type": "PAYMENT",
        "status": "FAILED",
        "failure_reason": "TEMPORARY_PAYMENT_FAILURE",
        "failure_category": "Payment Gateway Timeout",
        "occurred_at": now - datetime.timedelta(hours=3),
        "created_at": now - datetime.timedelta(hours=3),
    })

    # Scenario B: Arjun Kumar - ₹25,000, FAILED (High value approval required)
    transactions.append({
        "id": "txn_scenario_b_arjun",
        "merchant_id": merchant["id"],
        "customer_id": "cust_arjun_kumar",
        "external_transaction_id": "TXN-SCENARIO-B",
        "order_id": "order_scen_b_202",
        "amount": 25000.0,
        "currency": "INR",
        "payment_method": "CARD",
        "transaction_type": "PAYMENT",
        "status": "FAILED",
        "failure_reason": "PAYMENT_METHOD_DECLINED",
        "failure_category": "Card Issuer Limit Exceeded",
        "occurred_at": now - datetime.timedelta(hours=5),
        "created_at": now - datetime.timedelta(hours=5),
    })

    # Scenario C: Meera Thomas - ₹4,999, FAILED (Retry limit failure demo)
    transactions.append({
        "id": "txn_scenario_c_meera",
        "merchant_id": merchant["id"],
        "customer_id": "cust_meera_thomas",
        "external_transaction_id": "TXN-FAIL-001",
        "order_id": "order_fail_001",
        "amount": 4999.0,
        "currency": "INR",
        "payment_method": "NETBANKING",
        "transaction_type": "PAYMENT",
        "status": "FAILED",
        "failure_reason": "INSUFFICIENT_FUNDS",
        "failure_category": "Customer Account Insufficient Balance",
        "occurred_at": now - datetime.timedelta(hours=8),
        "created_at": now - datetime.timedelta(hours=8),
    })

    # Failure distributions
    failure_templates = [
        ("TEMPORARY_PAYMENT_FAILURE", "Payment Gateway Timeout", "PAYMENT", "UPI"),
        ("INSUFFICIENT_FUNDS", "Customer Account Insufficient Balance", "PAYMENT", "UPI"),
        ("NETWORK_ERROR", "NPCI Switch Timeout", "PAYMENT", "NETBANKING"),
        ("PAYMENT_METHOD_DECLINED", "Issuer Card Decline", "PAYMENT", "CARD"),
        ("EXPIRED_PAYMENT_METHOD", "Card Validity Expired", "SUBSCRIPTION", "CARD"),
        ("CUSTOMER_ABANDONED_CHECKOUT", "Checkout Drop-off", "CHECKOUT", "UPI"),
        ("SUBSCRIPTION_PAYMENT_FAILED", "Recurring Mandate Execution Failed", "SUBSCRIPTION", "MANDATE"),
        ("INVOICE_OVERDUE", "Net-30 Invoice Terms Expired", "INVOICE", "NETBANKING"),
    ]

    base_time = now - datetime.timedelta(days=30)

    for i in range(4, 265):
        cust = rng.choice(customers)
        txn_id = f"txn_{i:05d}"
        ext_id = f"TXN-{20250000 + i}"
        order_id = f"order_{rng.randint(10000, 99999)}"

        roll = rng.random()
        hours_offset = rng.uniform(0, 30 * 24)
        occurred = base_time + datetime.timedelta(hours=hours_offset)

        if roll < 0.60:
            amount = round(rng.choice([499.0, 999.0, 1499.0, 2499.0, 3999.0, 7500.0, 12000.0]), 2)
            method = rng.choice(["UPI", "CARD", "NETBANKING", "MANDATE", "WALLET"])
            ttype = rng.choice(["PAYMENT", "SUBSCRIPTION", "INVOICE"])
            transactions.append({
                "id": txn_id,
                "merchant_id": merchant["id"],
                "customer_id": cust["id"],
                "external_transaction_id": ext_id,
                "order_id": order_id,
                "amount": amount,
                "currency": "INR",
                "payment_method": method,
                "transaction_type": ttype,
                "status": "SUCCESS",
                "failure_reason": None,
                "failure_category": None,
                "occurred_at": occurred,
                "created_at": occurred,
            })
        else:
            reason, cat, default_type, default_method = rng.choice(failure_templates)
            amount_choice = rng.choices(
                [799.0, 1299.0, 2499.0, 4800.0, 8500.0, 15000.0, 28000.0],
                weights=[25, 25, 20, 15, 8, 5, 2]
            )[0]

            if reason == "CUSTOMER_ABANDONED_CHECKOUT":
                status = "ABANDONED"
                ttype = "CHECKOUT"
            elif reason == "INVOICE_OVERDUE":
                status = "OVERDUE"
                ttype = "INVOICE"
            else:
                status = "FAILED"
                ttype = default_type

            transactions.append({
                "id": txn_id,
                "merchant_id": merchant["id"],
                "customer_id": cust["id"],
                "external_transaction_id": ext_id,
                "order_id": order_id,
                "amount": amount_choice,
                "currency": "INR",
                "payment_method": default_method,
                "transaction_type": ttype,
                "status": status,
                "failure_reason": reason,
                "failure_category": cat,
                "occurred_at": occurred,
                "created_at": occurred,
            })

    return {
        "merchant": merchant,
        "customers": customers,
        "transactions": transactions,
    }
