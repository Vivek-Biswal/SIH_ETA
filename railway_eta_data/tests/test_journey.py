import pytest
import pandas as pd
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.journey.reconstruct import reconstruct_journeys, time_to_seconds
from src.journey.validators import validate_journey

def test_time_to_seconds():
    assert time_to_seconds("01:00:00") == 3600
    assert time_to_seconds("00:00:00") == 0
    assert time_to_seconds("None") == -1
    assert time_to_seconds(None) == -1
    assert time_to_seconds("24:00:00") == 86400
    assert time_to_seconds("invalid") == -1

def test_reconstruct_journeys_sorting():
    # Provide unordered stops
    data = [
        {"train_number": "123", "station_code": "B", "day": 1.0, "arrival": "10:00:00", "departure": "10:05:00"},
        {"train_number": "123", "station_code": "A", "day": 1.0, "arrival": "None", "departure": "09:00:00"},
        {"train_number": "123", "station_code": "C", "day": 2.0, "arrival": "08:00:00", "departure": "None"}
    ]
    df = pd.DataFrame(data)
    
    journeys = reconstruct_journeys(df)
    assert len(journeys) == 1
    
    route = journeys[0]["journey_route"]
    assert len(route) == 3
    
    # Check that sorting worked correctly (A -> B -> C)
    assert route[0]["station"] == "A"
    assert route[0]["sequence"] == 1
    
    assert route[1]["station"] == "B"
    assert route[1]["sequence"] == 2
    
    assert route[2]["station"] == "C"
    assert route[2]["sequence"] == 3

def test_validate_journey_missing_train():
    stops = [{"station": "A"}]
    issues = validate_journey("", stops)
    assert any(i["check"] == "Missing Train Number" for i in issues)

def test_validate_journey_empty():
    issues = validate_journey("123", [])
    assert any(i["check"] == "Empty Journey" for i in issues)

def test_validate_journey_single_stop():
    stops = [{"station": "A", "scheduled_arrival": "None", "scheduled_departure": "None"}]
    issues = validate_journey("123", stops)
    assert any(i["check"] == "Single-stop Journey" for i in issues)

def test_validate_journey_duplicate_stations():
    stops = [
        {"station": "A", "day": 1, "scheduled_arrival": "None", "scheduled_departure": "10:00:00"},
        {"station": "A", "day": 1, "scheduled_arrival": "11:00:00", "scheduled_departure": "11:05:00"}
    ]
    issues = validate_journey("123", stops)
    assert any(i["check"] == "Duplicate Consecutive Stations" for i in issues)

def test_validate_journey_missing_intermediate_time():
    stops = [
        {"station": "A", "day": 1, "scheduled_arrival": "None", "scheduled_departure": "10:00:00"},
        {"station": "B", "day": 1, "scheduled_arrival": "None", "scheduled_departure": "12:00:00"}, # Missing intermediate arrival
        {"station": "C", "day": 1, "scheduled_arrival": "13:00:00", "scheduled_departure": "None"}
    ]
    issues = validate_journey("123", stops)
    assert any(i["check"] == "Missing Intermediate Time" for i in issues)
