import pytest
import os
import sys

# Add project root to sys path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.cleaning.validators import parse_time, validate_station_code, validate_train_number, validate_distance, standardise_train_type
from src.cleaning.decision_log import DecisionLog

def test_time_validation():
    # parse_time returns (is_valid, time_obj, message)
    assert parse_time("14:30:00")[0] == True
    assert parse_time("48:00:00")[0] == False # invalid hour > 47
    assert parse_time("14:65:00")[0] == False # invalid minute
    assert parse_time(None)[0] == True  # None is considered valid null sentinel
    assert parse_time("")[0] == True  # empty string is considered valid null sentinel

def test_station_code_validation():
    valid_set = {"NDLS", "CST"}
    assert validate_station_code("NDLS", valid_set)[0] == "KEEP"
    assert validate_station_code("ABC", valid_set)[0] == "INVESTIGATE"
    assert validate_station_code("XX-123", valid_set)[0] == "INVESTIGATE"

def test_train_number_validation():
    valid_set = {"12919", "02501"}
    assert validate_train_number("12919", valid_set)[0] == "KEEP"
    assert validate_train_number("99999", valid_set)[0] == "INVESTIGATE"

def test_distance_validation():
    assert validate_distance(150.5)[0] == "KEEP"
    assert validate_distance(0)[0] == "INVESTIGATE"
    assert validate_distance(6000)[0] == "INVESTIGATE"
    assert validate_distance(-10)[0] == "EXCLUDE"

def test_decision_logging():
    log = DecisionLog()
    log.add("t#1", "test_source", "TEST_ISSUE", "EXCLUDE", "Because test", "val")
    summary = log.summary()
    assert summary["EXCLUDE"] == 1
    assert summary.get("MAP", 0) == 0
