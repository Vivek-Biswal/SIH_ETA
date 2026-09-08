"""
Delay Validators Module
========================
Input validation for delay analysis inputs.
"""
from typing import Optional


class DelayValidationError(ValueError):
    pass


def validate_delay_minutes(value: Optional[float], allow_none: bool = True) -> Optional[float]:
    if value is None:
        if allow_none:
            return None
        raise DelayValidationError("delay_minutes is required but missing.")
    try:
        v = float(value)
    except (TypeError, ValueError):
        raise DelayValidationError(f"delay_minutes must be numeric, got: {value!r}")
    if v < -60:
        raise DelayValidationError(
            f"delay_minutes={v} is implausibly negative (< -60). "
            "Genuine early arrivals rarely exceed 60 min early."
        )
    if v > 1440:
        raise DelayValidationError(
            f"delay_minutes={v} exceeds 1440 (24 hours). Likely a data error."
        )
    return v


def validate_train_number(value: str) -> str:
    v = str(value).strip()
    if not v:
        raise DelayValidationError("train_number must not be empty.")
    return v
