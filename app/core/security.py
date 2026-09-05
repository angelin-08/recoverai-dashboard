from typing import Optional
from fastapi import Header, HTTPException, status


def get_current_merchant_id(
    x_merchant_id: Optional[str] = Header(default="demo-merchant-001")
) -> str:
    """
    Extracts the merchant ID from request headers or defaults to the demo merchant.
    This provides a non-intrusive yet extensible development authentication layer.
    """
    if not x_merchant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Merchant authentication header missing",
        )
    return x_merchant_id
