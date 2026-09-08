"""
Tests for Leakage-Safe Feature Engineering Framework (Chunk 4)
"""
import sys
import os
import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.features.static_features import get_static_train_features, get_station_context
from src.features.route_features import get_route_features
from src.features.historical_features import get_historical_station_context
from src.features.live_features import get_live_train_state
from src.features.leakage import LeakageChecker
from src.features.builder import FeatureBuilder

# --- Mock Data ---
TRAINS_LOOKUP = {
    "12001": {"type": "Shatabdi", "distance": "500.5", "duration_h": "5", "duration_m": "30"},
    "12002": {"type": "Express", "distance": "bad_data", "duration_h": "null"}
}

STATIONS_LOOKUP = {
    "NDLS": {"state": "Delhi", "zone": "NR"},
    "BPL": {"state": "MP", "zone": "WCR"}
}

JOURNEYS_LOOKUP = {
    "12001": [{"station": "BPL"}, {"station": "JHS"}, {"station": "NDLS"}]
}

DA323_LOOKUP = {
    "NDLS": {"avg_delay_minutes": "15.5"}
}

DELAYS_LOOKUP = {
    "12001": {"delay": "45"}
}

# --- Tests ---

def test_static_train_features():
    feat = get_static_train_features("12001", TRAINS_LOOKUP)
    assert feat["train_type"] == "Shatabdi"
    assert feat["route_distance"] == 500.5
    assert feat["scheduled_duration_hours"] == 5.5

def test_static_train_features_bad_data():
    feat = get_static_train_features("12002", TRAINS_LOOKUP)
    assert feat["train_type"] == "Express"
    assert feat["route_distance"] is None
    assert feat["scheduled_duration_hours"] is None

def test_station_context():
    feat = get_station_context("NDLS", STATIONS_LOOKUP)
    assert feat["state"] == "Delhi"
    assert feat["zone"] == "NR"

def test_route_features():
    feat = get_route_features("12001", 500.5, JOURNEYS_LOOKUP)
    assert feat["stop_count"] == 3
    # 500.5 / (3-1) = 250.25
    assert feat["average_distance_between_stops"] == 250.25

def test_historical_features():
    feat = get_historical_station_context("NDLS", DA323_LOOKUP)
    assert feat["historical_average_delay"] == 15.5

def test_live_features():
    feat = get_live_train_state("12001", DELAYS_LOOKUP)
    assert feat["current_delay_minutes"] == 45.0

def test_leakage_checker():
    # Test valid
    res = LeakageChecker.evaluate_feature("train_type", "trains.json", "STATIC_AVAILABLE")
    assert res["leakage_risk"] == "SAFE"
    
    # Test conditional
    res = LeakageChecker.evaluate_feature("current_delay", "delays.json", "LIVE_AVAILABLE")
    assert res["leakage_risk"] == "CONDITIONALLY_SAFE"
    
    # Test unsafe DA323
    res = LeakageChecker.evaluate_feature("avg_delay", "da323.csv", "HISTORICAL_CONTEXT")
    assert res["leakage_risk"] == "UNSAFE"
    assert res["temporal_status"] == "UNKNOWN_PROVENANCE"

def test_feature_builder():
    builder = FeatureBuilder(TRAINS_LOOKUP, STATIONS_LOOKUP, JOURNEYS_LOOKUP, DA323_LOOKUP, DELAYS_LOOKUP)
    
    dyn_rec = builder.build_dynamic_record("12001", "NDLS", "2026-09-08T12:00:00")
    
    assert dyn_rec.train_number == "12001"
    assert dyn_rec.prediction_timestamp == "2026-09-08T12:00:00"
    assert dyn_rec.current_delay_minutes == 45.0
    assert dyn_rec.prediction_context_complete is False
    assert dyn_rec.actual_arrival_time is None
    
    sf = dyn_rec.static_features
    assert sf.destination_station == "NDLS"
    assert sf.train_type == "Shatabdi"
    assert sf.stop_count == 3
    assert sf.destination_historical_avg_delay == 15.5
