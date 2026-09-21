from datetime import datetime, timezone
from services.railradar_passenger import eta_response, status_response
from services import railradar_passenger as provider
from fastapi import HTTPException
import pytest


def observation():
    return {"trainNumber": "12301", "trainName": "Fixture train", "startDate": "2026-09-21",
            "isLive": True, "lastUpdatedAt": "2026-09-21T10:00:00Z", "delayMinutes": 12,
            "currentLocation": {"stationCode": "AAA"},
            "route": [{"stationCode": "AAA", "stationName": "Fixture station",
                       "actualDeparture": "2026-09-21T10:00:00Z", "status": "departed"},
                      {"stationCode": "BBB", "stationName": "Fixture next station", "status": "upcoming",
                       "scheduledArrival": "2026-09-21T11:00:00Z"}]}


def test_live_delay_baseline_is_explicit_and_has_no_invented_causes():
    data = observation()
    now = datetime(2026, 9, 21, 10, 1, tzinfo=timezone.utc)
    result = eta_response(data, now)
    assert result["prediction_method"] == "delay_adjusted"
    assert result["remaining_stations"][1]["predicted_arrival"] == "2026-09-21T11:12:00+00:00"
    assert result["remaining_stations"][0]["predicted_arrival"] is None
    assert result["delay_factors"] == []
    assert "Assumes the delay persists" in result["explanation"]
    assert status_response(data, now)["data_source"] == "live"


def test_stale_or_missing_observation_never_becomes_a_live_prediction():
    data = observation()
    now = datetime(2026, 9, 21, 10, 10, tzinfo=timezone.utc)
    assert eta_response(data, now)["prediction_method"] == "schedule_only"
    assert status_response(data, now)["data_source"] == "cached"
    data["lastUpdatedAt"] = None
    assert status_response(data, now)["last_known_location"] is None
    assert eta_response(data, now)["remaining_stations"][1]["predicted_arrival"] is None


def test_missing_delay_and_undated_timetable_are_not_guessed():
    data = observation()
    now = datetime(2026, 9, 21, 10, 1, tzinfo=timezone.utc)
    data["delayMinutes"] = None
    assert eta_response(data, now)["prediction_method"] == "schedule_only"
    assert status_response(data, now)["last_known_location"]["delay_minutes"] is None
    data["delayMinutes"] = 12
    data["route"][1]["scheduledArrival"] = "11:00"
    assert eta_response(data, now)["remaining_stations"][1]["predicted_arrival"] is None


def test_directory_contracts_do_not_generate_missing_names(monkeypatch):
    monkeypatch.setattr(provider, "resource", lambda *args: [{"number": "12301", "name": "Fixture train"}])
    assert provider.lookup_trains("fixture")["results"] == [{"train_number": "12301", "train_name": "Fixture train"}]
    monkeypatch.setattr(provider, "resource", lambda *args: [{"code": "AAA"}])
    with pytest.raises(HTTPException) as error:
        provider.lookup_stations("AA")
    assert error.value.status_code == 503


def test_between_stations_preserves_returned_segment_and_paginates(monkeypatch):
    data = {"from": {"code": "AAA", "name": "First"}, "to": {"code": "BBB", "name": "Second"},
            "trains": [{"train": {"number": "12301", "name": "Fixture", "runDays": ["mon"]},
                        "from": {"departure": "23:00"}, "to": {"arrival": "01:00"}, "duration": 120}]}
    monkeypatch.setattr(provider, "resource", lambda *args: data)
    result = provider.between("AAA", "BBB", None, 1, 20)
    assert result["trains"][0]["duration_minutes"] == 120
    assert result["trains"][0]["from_station"]["code"] == "AAA"
    assert provider.between("AAA", "BBB", None, 2, 20)["trains"] == []


def test_board_does_not_promote_schedule_to_live(monkeypatch):
    monkeypatch.setattr(provider, "resource", lambda *args: {"trains": [
        {"train": {"number": "12301", "name": "Fixture"}, "stop": {"departure": "12:00"}},
        {"train": {"number": "12302", "name": "Fixture terminal"}, "stop": {"departure": None}},
    ]})
    result = provider.board("AAA")
    assert result["board_type"] == "scheduled"
    assert result["live_available"] is False
    assert len(result["results"]) == 1
