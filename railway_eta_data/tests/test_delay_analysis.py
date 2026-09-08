"""
Tests for Delay-DNA Analysis Framework (Chunk 5)
"""
import sys
import os
import pytest
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.delay_analysis.current_delay import parse_observations, compute_summary, categorize_delay
from src.delay_analysis.historical_delay import parse_da323_records, compute_historical_summary, build_station_lookup
from src.delay_analysis.station_patterns import analyze_station_coverage
from src.delay_analysis.contract import DelayDNAProfile
from src.delay_analysis.recovery import (
    calculate_delay_change, check_recovery_feasibility,
    RecoveryAnalysisUnavailable, DelayObservationPair
)
from src.delay_analysis.validators import validate_delay_minutes, DelayValidationError

# --- Test Data ---
SAMPLE_DELAYS = [
    {"train_number": "12001", "delay_min": 45, "cancelled": False, "snapshot_ts": "2026-09-06T18:30:40Z"},
    {"train_number": "12002", "delay_min": 5,  "cancelled": False, "snapshot_ts": "2026-09-06T18:30:40Z"},
    {"train_number": "12003", "delay_min": None, "cancelled": True,  "snapshot_ts": "2026-09-06T18:30:40Z"},
    {"train_number": "12004", "delay_min": 250, "cancelled": False, "snapshot_ts": "2026-09-06T18:30:40Z"},
]

SAMPLE_DA323 = [
    {"station_code": "NDLS", "station_name": "NEW DELHI", "avg_delay_minutes": 10.0, "percent_right_time": 80.0, "percent_significant_delay": 5.0},
    {"station_code": "CSTM", "station_name": "MUMBAI CST", "avg_delay_minutes": 200.0, "percent_right_time": 10.0, "percent_significant_delay": 70.0},
    {"station_code": "NDLS", "station_name": "NEW DELHI", "avg_delay_minutes": 20.0, "percent_right_time": 60.0, "percent_significant_delay": 10.0},
]


# --- Current Delay Tests ---

def test_valid_delay_observation():
    obs = parse_observations(SAMPLE_DELAYS)
    valid = [o for o in obs if o.delay_minutes is not None and not o.cancelled]
    assert len(valid) == 3

def test_missing_delay_marked_as_none():
    obs = parse_observations(SAMPLE_DELAYS)
    cancelled = [o for o in obs if o.cancelled]
    assert len(cancelled) == 1
    assert cancelled[0].delay_minutes is None

def test_delay_categorization():
    assert categorize_delay(5) == "low"
    assert categorize_delay(30) == "moderate"
    assert categorize_delay(100) == "high"
    assert categorize_delay(300) == "severe"
    assert categorize_delay(0) == "none"

def test_compute_summary_stats():
    obs = parse_observations(SAMPLE_DELAYS)
    summary = compute_summary(obs)
    assert summary["total_records"] == 4
    assert summary["valid_delay_observations"] == 3
    assert summary["cancelled_count"] == 1
    assert summary["max_delay"] == 250
    assert summary["min_delay"] == 5

def test_snapshot_note_in_summary():
    obs = parse_observations(SAMPLE_DELAYS)
    summary = compute_summary(obs)
    assert "SINGLE_SNAPSHOT" in summary["snapshot_note"]


# --- Historical Aggregated Tests ---

def test_historical_records_parsed():
    records = parse_da323_records(SAMPLE_DA323)
    assert len(records) == 3

def test_historical_temporal_status():
    records = parse_da323_records(SAMPLE_DA323)
    for r in records:
        assert r.temporal_status == "TEMPORALLY_UNKNOWN"

def test_historical_summary_warning():
    records = parse_da323_records(SAMPLE_DA323)
    summary = compute_historical_summary(records)
    assert "CANNOT" in summary["warning"]

def test_station_lookup_deduplication():
    records = parse_da323_records(SAMPLE_DA323)
    lookup = build_station_lookup(records)
    # NDLS appears twice — should be averaged
    assert "NDLS" in lookup
    assert lookup["NDLS"].avg_delay_minutes == 15.0  # mean(10, 20)


# --- Station Coverage Test ---

def test_station_coverage():
    records = parse_da323_records(SAMPLE_DA323)
    lookup = build_station_lookup(records)
    coverage = analyze_station_coverage(["NDLS", "CSTM", "PNBE", "HWH"], lookup)
    assert coverage["matched_records"] == 2
    assert coverage["unmatched_records"] == 2
    assert "PNBE" in coverage["unmatched_sample"]


# --- Delay-DNA Profile Tests ---

def test_dna_profile_created():
    profile = DelayDNAProfile(train_number="12001")
    assert profile.actual_arrival_time is None
    assert profile.historical_trajectory is None
    assert "actual arrival" in profile.data_completeness_note.lower() or "ml training" in profile.data_completeness_note.lower()


# --- Recovery Tests ---

def test_recovery_valid_pair():
    pair = DelayObservationPair(
        train_number="12001",
        delay_minutes_t1=60.0,
        timestamp_t1="2026-09-08T10:00:00Z",
        delay_minutes_t2=40.0,
        timestamp_t2="2026-09-08T11:00:00Z"
    )
    result = calculate_delay_change(pair)
    assert result["delay_change"] == -20.0
    assert result["recovery_minutes"] == 20.0
    assert result["trend"] == "RECOVERED"

def test_recovery_worsened():
    pair = DelayObservationPair(
        train_number="12001",
        delay_minutes_t1=30.0,
        timestamp_t1="2026-09-08T10:00:00Z",
        delay_minutes_t2=60.0,
        timestamp_t2="2026-09-08T11:00:00Z"
    )
    result = calculate_delay_change(pair)
    assert result["trend"] == "WORSENED"

def test_recovery_rejected_bad_timestamp_order():
    pair = DelayObservationPair(
        train_number="12001",
        delay_minutes_t1=30.0,
        timestamp_t1="2026-09-08T12:00:00Z",
        delay_minutes_t2=20.0,
        timestamp_t2="2026-09-08T10:00:00Z"  # T2 < T1
    )
    with pytest.raises(RecoveryAnalysisUnavailable):
        calculate_delay_change(pair)

def test_recovery_rejected_negative_delay():
    pair = DelayObservationPair(
        train_number="12001",
        delay_minutes_t1=-100.0,
        timestamp_t1="2026-09-08T10:00:00Z",
        delay_minutes_t2=20.0,
        timestamp_t2="2026-09-08T11:00:00Z"
    )
    with pytest.raises(RecoveryAnalysisUnavailable):
        calculate_delay_change(pair)

def test_recovery_infeasible_with_single_snapshot():
    counts = {"12001": 1, "12002": 1, "12003": 1}
    result = check_recovery_feasibility(counts)
    assert result["feasible"] is False
    assert result["trains_with_sufficient_data"] == 0


# --- Validators ---

def test_delay_validator_valid():
    assert validate_delay_minutes(45.0) == 45.0
    assert validate_delay_minutes(None) is None

def test_delay_validator_implausibly_negative():
    with pytest.raises(DelayValidationError):
        validate_delay_minutes(-500.0)

def test_delay_validator_over_24h():
    with pytest.raises(DelayValidationError):
        validate_delay_minutes(2000.0)
