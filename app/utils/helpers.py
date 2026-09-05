import datetime
from typing import Optional


def utcnow() -> datetime.datetime:
    """Returns timezone-naive UTC current datetime (standard for SQLite/Postgres DB timestamp storage)."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def format_currency_inr(amount: float) -> str:
    """Formats a float as INR currency representation."""
    return f"INR {amount:,.2f}"


def format_currency_symbol(amount: float) -> str:
    """Formats a float as ₹ symbol representation."""
    return f"₹{amount:,.2f}"


def get_hours_difference(start_time: datetime.datetime, end_time: Optional[datetime.datetime] = None) -> float:
    """Returns the elapsed hours between two datetimes (defaults end_time to utcnow)."""
    if end_time is None:
        end_time = utcnow()
    if start_time.tzinfo is not None:
        start_time = start_time.replace(tzinfo=None)
    if end_time.tzinfo is not None:
        end_time = end_time.replace(tzinfo=None)
    diff = end_time - start_time
    return max(0.0, diff.total_seconds() / 3600.0)
