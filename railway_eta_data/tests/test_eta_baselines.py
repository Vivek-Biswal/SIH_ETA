"""
Tests for ETA Baseline System (Chunk 3)
=========================================
All tests use controlled fixture data.
No real datasets are loaded or modified.
"""
import sys
import os
import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.eta.predictor import predict_eta, build_journeys_lookup
from src.eta.validators import (
    ETAValidationError,
    validate_train_number,
    validate_destination_in_route,
    validate_destination_after_current,
    validate_delay,
    validate_time_string,
)
from src.eta.schedule_baseline import time_str_to_minutes, add_delay_to_time


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_ROUTE = [
    {"station": "SRC", "sequence": 1, "scheduled_arrival": None,       "scheduled_departure": "06:00:00", "day": 1.0},
    {"station": "MID", "sequence": 2, "scheduled_arrival": "10:00:00", "scheduled_departure": "10:05:00", "day": 1.0},
    {"station": "NGP", "sequence": 3, "scheduled_arrival": "23:30:00", "scheduled_departure": "23:35:00", "day": 1.0},
    {"station": "DST", "sequence": 4, "scheduled_arrival": "06:00:00", "scheduled_departure": None,       "day": 2.0},
]

SAMPLE_JOURNEYS_LIST = [
    {"train_number": "12001", "journey_route": SAMPLE_ROUTE},
]

LOOKUP = build_journeys_lookup(SAMPLE_JOURNEYS_LIST)


# ─────────────────────────────────────────────────────────────────────────────
# Validator Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_validate_train_number_valid():
    assert validate_train_number("12001") == "12001"
    assert validate_train_number("  12001  ") == "12001"

def test_validate_train_number_empty():
    with pytest.raises(ETAValidationError):
        validate_train_number("")
    with pytest.raises(ETAValidationError):
        validate_train_number("   ")

def test_validate_destination_found():
    stop = validate_destination_in_route("DST", SAMPLE_ROUTE)
    assert stop["station"] == "DST"

def test_validate_destination_not_found():
    with pytest.raises(ETAValidationError):
        validate_destination_in_route("XXX", SAMPLE_ROUTE)

def test_validate_destination_after_current_ok():
    validate_destination_after_current("SRC", "DST", SAMPLE_ROUTE)  # Should not raise

def test_validate_destination_before_current():
    with pytest.raises(ETAValidationError):
        validate_destination_after_current("DST", "SRC", SAMPLE_ROUTE)

def test_validate_destination_same_as_current():
    with pytest.raises(ETAValidationError):
        validate_destination_after_current("MID", "MID", SAMPLE_ROUTE)

def test_validate_delay_valid():
    assert validate_delay(30.0) == 30.0
    assert validate_delay(0) == 0.0
    assert validate_delay(None) is None

def test_validate_delay_too_negative():
    with pytest.raises(ETAValidationError):
        validate_delay(-120)

def test_validate_delay_too_large():
    with pytest.raises(ETAValidationError):
        validate_delay(1500)

def test_validate_time_string():
    assert validate_time_string("10:00:00") is True
    assert validate_time_string(None) is False
    assert validate_time_string("None") is False

def test_validate_time_string_bad_format():
    with pytest.raises(ETAValidationError):
        validate_time_string("10-00-00", "arrival")


# ─────────────────────────────────────────────────────────────────────────────
# Time Helper Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_time_to_minutes():
    assert time_str_to_minutes("00:00:00") == 0
    assert time_str_to_minutes("01:00:00") == 60
    assert time_str_to_minutes("23:59:00") == 23 * 60 + 59
    assert time_str_to_minutes(None) is None
    assert time_str_to_minutes("None") is None

def test_add_delay_to_time_normal():
    result = add_delay_to_time("10:00:00", 30)
    assert result == "10:30:00"

def test_add_delay_to_time_zero():
    result = add_delay_to_time("10:00:00", 0)
    assert result == "10:00:00"

def test_add_delay_to_time_overnight():
    # 23:30 + 60 min = 24:30 (next day — day tracking is separate)
    result = add_delay_to_time("23:30:00", 60)
    assert result == "24:30:00"


# ─────────────────────────────────────────────────────────────────────────────
# Schedule Baseline Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_schedule_baseline_valid():
    pred = predict_eta("12001", "DST", LOOKUP)
    assert pred.status == "OK"
    assert pred.prediction_method == "SCHEDULE_BASELINE"
    assert pred.scheduled_arrival == "06:00:00"
    assert pred.scheduled_day == 2.0
    assert pred.current_delay_minutes is None

def test_schedule_baseline_mid_station():
    pred = predict_eta("12001", "MID", LOOKUP)
    assert pred.status == "OK"
    assert pred.scheduled_arrival == "10:00:00"
    assert pred.scheduled_day == 1.0

def test_schedule_baseline_invalid_train():
    pred = predict_eta("99999", "DST", LOOKUP)
    assert pred.status == "ERROR"
    assert "not found" in pred.message.lower()

def test_schedule_baseline_invalid_destination():
    pred = predict_eta("12001", "ZZZ", LOOKUP)
    assert pred.status == "INVALID_DESTINATION"

def test_schedule_baseline_destination_before_current():
    pred = predict_eta("12001", "SRC", LOOKUP, current_station="DST")
    assert pred.status == "ERROR"


# ─────────────────────────────────────────────────────────────────────────────
# Delay-Adjusted Baseline Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_delay_adjusted_baseline_valid():
    pred = predict_eta("12001", "DST", LOOKUP, current_delay_minutes=30)
    assert pred.status == "OK"
    assert pred.prediction_method == "DELAY_ADJUSTED_BASELINE"
    assert pred.current_delay_minutes == 30
    # Scheduled 06:00 + 30 min = 06:30
    assert pred.predicted_arrival == "06:30:00"

def test_delay_adjusted_zero_delay():
    pred = predict_eta("12001", "DST", LOOKUP, current_delay_minutes=0)
    assert pred.status == "OK"
    assert pred.prediction_method == "DELAY_ADJUSTED_BASELINE"
    # Zero delay — should equal scheduled
    assert pred.predicted_arrival == pred.scheduled_arrival

def test_delay_adjusted_overnight():
    # NGP is at 23:30 day 1. Adding 60 min should give 24:30 (day boundary)
    pred = predict_eta("12001", "NGP", LOOKUP, current_delay_minutes=60)
    assert pred.status == "OK"
    assert pred.predicted_arrival == "24:30:00"

def test_delay_adjusted_missing_delay_falls_back():
    pred = predict_eta("12001", "DST", LOOKUP, current_delay_minutes=None)
    assert pred.status == "OK"
    assert "SCHEDULE_BASELINE" in pred.prediction_method

def test_delay_adjusted_invalid_train():
    pred = predict_eta("99999", "DST", LOOKUP, current_delay_minutes=30)
    assert pred.status == "ERROR"

def test_delay_adjusted_invalid_destination():
    pred = predict_eta("12001", "XXX", LOOKUP, current_delay_minutes=30)
    assert pred.status == "INVALID_DESTINATION"

def test_delay_adjusted_invalid_delay_value():
    pred = predict_eta("12001", "DST", LOOKUP, current_delay_minutes=-200)
    assert pred.status == "ERROR"


# ─────────────────────────────────────────────────────────────────────────────
# Assumptions Check
# ─────────────────────────────────────────────────────────────────────────────

def test_schedule_baseline_has_assumptions():
    pred = predict_eta("12001", "DST", LOOKUP)
    assert len(pred.assumptions) > 0

def test_delay_baseline_has_assumptions():
    pred = predict_eta("12001", "DST", LOOKUP, current_delay_minutes=20)
    assert len(pred.assumptions) > 0
    # Must mention delay persistence assumption
    joined = " ".join(pred.assumptions).lower()
    assert "persist" in joined or "constant" in joined or "delay" in joined
