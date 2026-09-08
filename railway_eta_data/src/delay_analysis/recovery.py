"""
Recovery Analysis Module
========================
Defines the FUTURE framework for delay recovery analysis.

CURRENT STATUS: Not computable.

Reason: The project does not currently possess time-aligned sequential
delay observations for individual trains (T1 -> T2 pairs). Without that,
delay change (recovery or worsening) cannot be measured.

This module provides validated interfaces for future use.
"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timezone


class RecoveryAnalysisUnavailable(Exception):
    """Raised when recovery analysis is attempted without valid time-series data."""
    pass


@dataclass
class DelayObservationPair:
    """
    Represents two timestamped observations of the same train for
    computing delay change. Both observations must exist and be verified.
    """
    train_number: str
    delay_minutes_t1: float
    timestamp_t1: str   # ISO string
    delay_minutes_t2: float
    timestamp_t2: str   # ISO string


def calculate_delay_change(pair: DelayObservationPair) -> dict:
    """
    Calculates delay change between two valid timestamped observations.

    Validates:
    1. Same train number.
    2. Valid timestamps.
    3. T2 strictly after T1.
    4. Valid (non-negative) delay values.

    Returns a dict with delay_change and recovery classification.
    Raises RecoveryAnalysisUnavailable for invalid input.
    """
    if pair.delay_minutes_t1 < 0 or pair.delay_minutes_t2 < 0:
        raise RecoveryAnalysisUnavailable("Delay values must be non-negative.")

    try:
        t1 = datetime.fromisoformat(pair.timestamp_t1.replace("Z", "+00:00"))
        t2 = datetime.fromisoformat(pair.timestamp_t2.replace("Z", "+00:00"))
    except (ValueError, AttributeError) as e:
        raise RecoveryAnalysisUnavailable(f"Invalid timestamp format: {e}")

    if t2 <= t1:
        raise RecoveryAnalysisUnavailable(
            f"T2 ({pair.timestamp_t2}) must be strictly after T1 ({pair.timestamp_t1})."
        )

    delay_change = pair.delay_minutes_t2 - pair.delay_minutes_t1
    recovery = -delay_change   # positive = recovered, negative = worsened

    return {
        "train_number": pair.train_number,
        "timestamp_t1": pair.timestamp_t1,
        "timestamp_t2": pair.timestamp_t2,
        "delay_at_t1": pair.delay_minutes_t1,
        "delay_at_t2": pair.delay_minutes_t2,
        "delay_change": round(delay_change, 2),
        "recovery_minutes": round(recovery, 2),
        "trend": "RECOVERED" if recovery > 0 else ("WORSENED" if recovery < 0 else "UNCHANGED"),
        "note": (
            "This calculation is only valid if both observations are verified time-aligned "
            "snapshots of the same train. A single snapshot cannot be used as T1 or T2."
        )
    }


def check_recovery_feasibility(available_snapshots_per_train: dict) -> dict:
    """
    Checks whether recovery analysis is feasible given available snapshots.
    Returns a status report.

    Args:
        available_snapshots_per_train: dict mapping train_number -> count of timestamped observations
    """
    trains_with_enough = {
        t: n for t, n in available_snapshots_per_train.items() if n >= 2
    }

    if not trains_with_enough:
        return {
            "feasible": False,
            "reason": (
                "No trains have 2 or more time-aligned delay observations. "
                "Recovery analysis requires at minimum 2 timestamped snapshots per train."
            ),
            "trains_with_sufficient_data": 0,
            "total_trains_checked": len(available_snapshots_per_train)
        }

    return {
        "feasible": True,
        "trains_with_sufficient_data": len(trains_with_enough),
        "total_trains_checked": len(available_snapshots_per_train)
    }
