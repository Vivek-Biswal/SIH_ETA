"""
Tests for System Integration (Chunk 6)
"""
import sys
import os
import pytest
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.system.orchestrator import ETAOrchestrator
from src.state.builder import TrainStateBuilder
from src.state.contract import TrainState
from src.state.validators import StateValidationError

# --- Mock Data ---
TRAINS_LOOKUP = {
    "12001": {"number": "12001", "type": "Express", "distance": "1500"},
    "12002": {"number": "12002", "type": "Local", "distance": "50"}
}

JOURNEYS_LOOKUP = {
    "12001": [
        {"station": "BPL", "day": 1.0, "scheduled_departure": "10:00:00"},
        {"station": "JHS", "day": 1.0, "scheduled_arrival": "14:00:00", "scheduled_departure": "14:10:00"},
        {"station": "NDLS", "day": 1.0, "scheduled_arrival": "20:00:00"}
    ]
}

HISTORICAL_LOOKUP = {
    "NDLS": {"station_code": "NDLS", "avg_delay_minutes": 25.0}
}


@pytest.fixture
def state_builder():
    return TrainStateBuilder(
        trains_lookup=TRAINS_LOOKUP,
        journeys_lookup=JOURNEYS_LOOKUP,
        historical_lookup=HISTORICAL_LOOKUP,
        live_delays_lookup={}
    )


@pytest.fixture
def orchestrator(state_builder):
    return ETAOrchestrator(state_builder, JOURNEYS_LOOKUP)


# --- TrainState Tests ---

def test_trainstate_missing_live_position(state_builder):
    state = state_builder.build("12001", "NDLS")
    assert state.current_position is None
    assert state.position_availability.status == "NOT_AVAILABLE"

def test_trainstate_missing_speed(state_builder):
    state = state_builder.build("12001", "NDLS")
    assert state.current_speed is None
    assert state.speed_availability.status == "NOT_AVAILABLE"

def test_invalid_train(state_builder):
    with pytest.raises(StateValidationError, match="not found"):
        state_builder.build("99999", "NDLS")

def test_invalid_destination(state_builder):
    with pytest.raises(StateValidationError, match="not found in scheduled route"):
        state_builder.build("12001", "CSTM")

# --- System Orchestrator Tests ---

def test_valid_schedule_only_eta(orchestrator):
    req = {
        "train_number": "12001",
        "destination_station": "NDLS",
        "request_timestamp": "2026-09-08T10:00:00Z"
    }
    resp = orchestrator.process_request(req)
    assert resp["status"] == "OK"
    assert resp["prediction_method"] == "SCHEDULE_BASELINE"
    assert resp["data_completeness_status"] == "SCHEDULE_ONLY"
    assert resp["predicted_arrival"] == "20:00:00"

def test_valid_delay_adjusted_eta(orchestrator):
    req = {
        "train_number": "12001",
        "destination_station": "NDLS",
        "current_delay_minutes": 30.0,
        "request_timestamp": "2026-09-08T10:00:00Z"
    }
    resp = orchestrator.process_request(req)
    assert resp["status"] == "OK"
    assert resp["prediction_method"] == "DELAY_ADJUSTED_BASELINE"
    assert resp["data_completeness_status"] == "DELAY_AVAILABLE"
    assert resp["predicted_arrival"] == "20:30:00"

def test_invalid_train_orchestrator(orchestrator):
    req = {
        "train_number": "99999",
        "destination_station": "NDLS"
    }
    resp = orchestrator.process_request(req)
    assert resp["status"] == "ERROR"
    assert resp["error_code"] == "INVALID_REQUEST"
    assert "not found" in resp["message"].lower()

def test_invalid_destination_orchestrator(orchestrator):
    req = {
        "train_number": "12001",
        "destination_station": "CSTM"
    }
    resp = orchestrator.process_request(req)
    assert resp["status"] == "ERROR"
    assert resp["error_code"] == "INVALID_REQUEST"
    assert "not found in scheduled route" in resp["message"].lower()

def test_missing_schedule(orchestrator):
    req = {
        "train_number": "12002", # In TRAINS_LOOKUP, but not JOURNEYS_LOOKUP
        "destination_station": "CSTM"
    }
    resp = orchestrator.process_request(req)
    assert resp["status"] == "ERROR"
    assert resp["error_code"] == "INVALID_REQUEST"
    assert "scheduled journey not found" in resp["message"].lower()

def test_response_assumptions_schedule(orchestrator):
    req = {
        "train_number": "12001",
        "destination_station": "NDLS"
    }
    resp = orchestrator.process_request(req)
    assert any("does not currently know the train's live position" in a for a in resp["assumptions"])
    
def test_response_assumptions_delay(orchestrator):
    req = {
        "train_number": "12001",
        "destination_station": "NDLS",
        "current_delay_minutes": 10.0
    }
    resp = orchestrator.process_request(req)
    assert any("assumes the current delay persists" in a for a in resp["assumptions"])

def test_response_limitations(orchestrator):
    req = {
        "train_number": "12001",
        "destination_station": "NDLS"
    }
    resp = orchestrator.process_request(req)
    assert any("DA323" in l for l in resp["limitations"])
    assert any("position, speed" in l for l in resp["limitations"])

def test_no_unsafe_da323_use(orchestrator):
    # Even though NDLS has an avg delay of 25 mins in DA323, a schedule-only request
    # should NOT silently add this delay. The ETA should remain exactly on schedule.
    req = {
        "train_number": "12001",
        "destination_station": "NDLS"
    }
    resp = orchestrator.process_request(req)
    assert resp["predicted_arrival"] == "20:00:00"

def test_no_fabricated_live_values(state_builder):
    state = state_builder.build("12001", "NDLS")
    assert state.current_position is None
    assert state.current_speed is None
    assert state.delay_timestamp is None
