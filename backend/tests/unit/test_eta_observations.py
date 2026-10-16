from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import sqlite3
import zlib

import pytest

from services import eta_observations as archive


NOW = datetime(2026, 10, 15, 10, 2, tzinfo=timezone.utc)


def live():
    return {
        "trainNumber": "12301", "trainName": "Test train", "startDate": "2026-10-15",
        "lastUpdatedAt": "2026-10-15T10:00:00Z", "isLive": True, "delayMinutes": 12,
        "status": "running", "currentLocation": {
            "stationCode": "AAA", "sequence": 1, "speedKmh": 60, "segmentProgress": 0.5,
        }, "route": [
            {"stationCode": "AAA", "stationName": "First station", "sequence": 1,
             "scheduledArrival": "2026-10-15T09:00:00Z", "actualArrival": "2026-10-15T09:12:00Z",
             "actualDeparture": "2026-10-15T09:15:00Z", "delayArrival": 12, "status": "departed"},
            {"stationCode": "BBB", "stationName": "Next station", "sequence": 2,
             "scheduledArrival": "2026-10-15T11:00:00Z", "actualArrival": None,
             "distanceFromStart": 100, "status": "upcoming"},
        ],
    }


def exported(tmp_path):
    destination = tmp_path / "observations.jsonl"
    count = archive.export_observations(tmp_path / "history.sqlite3", destination)
    return count, [json.loads(line) for line in destination.read_text(encoding="utf-8").splitlines()]


def test_roundtrip_deduplicates_provider_time_and_preserves_first_receipt(tmp_path):
    path = tmp_path / "history.sqlite3"
    payload = live()
    original = deepcopy(payload)
    assert archive.record_observation(payload, NOW, path)
    payload["delayMinutes"] = 99
    payload["lastUpdatedAt"] = "2026-10-15T15:30:00+05:30"
    assert not archive.record_observation(payload, NOW + timedelta(minutes=1), path)
    count, rows = exported(tmp_path)
    assert count == 1
    assert rows[0]["data"]["delayMinutes"] == original["delayMinutes"]
    assert rows[0]["data"]["route"][0]["actualArrival"] == original["route"][0]["actualArrival"]
    assert rows[0]["observed_at"] == "2026-10-15T10:00:00Z"
    assert rows[0]["received_at"] == "2026-10-15T10:02:00Z"
    assert rows[0]["provider"] == "railradar" and rows[0]["schema_version"] == 1


def test_changed_provider_time_is_a_new_observation_without_mutating_input(tmp_path):
    payload = live()
    original = deepcopy(payload)
    assert archive.record_observation(payload, NOW, tmp_path / "history.sqlite3")
    assert payload == original
    payload["lastUpdatedAt"] = "2026-10-15T10:01:00Z"
    assert archive.record_observation(payload, NOW, tmp_path / "history.sqlite3")
    assert exported(tmp_path)[0] == 2


def test_whitelist_drops_keys_nested_payloads_and_nonfinite_numbers(tmp_path):
    payload = live()
    payload.update(apiKey="secret-top", authorization="secret-header", extra={"key": "secret-extra"})
    payload["currentLocation"].update(apiKey="secret-location", speedKmh=float("nan"))
    payload["route"][0].update(secret="secret-stop", credentials={"token": "secret-nested"})
    payload["route"][1]["stationName"] = {"key": "secret-instead-of-name"}
    assert archive.record_observation(payload, NOW, tmp_path / "history.sqlite3")
    _, rows = exported(tmp_path)
    assert "secret" not in json.dumps(rows)
    assert "speedKmh" not in rows[0]["data"]["currentLocation"]
    assert "stationName" not in rows[0]["data"]["route"][1]
    with sqlite3.connect(tmp_path / "history.sqlite3") as db:
        body = db.execute("SELECT snapshot FROM eta_observations").fetchone()[0]
    assert isinstance(body, bytes) and "secret" not in zlib.decompress(body).decode()


@pytest.mark.parametrize("change", [
    {"_railradar_stale": True}, {"lastUpdatedAt": "2026-10-15T10:03:00Z"},
    {"lastUpdatedAt": "2026-10-15T10:00:00"}, {"lastUpdatedAt": "10:00"},
    {"lastUpdatedAt": None}, {"trainNumber": "bad"}, {"trainNumber": "１２３０１"},
    {"startDate": "2026-02-30"}, {"startDate": "20261015"},
    {"route": "secret-bad-route"}, {"route": []}, {"route": ["invalid"]},
])
def test_invalid_and_stale_records_do_not_create_database(tmp_path, change):
    payload = live()
    payload.update(change)
    path = tmp_path / "history.sqlite3"
    assert not archive.record_observation(payload, NOW, path)
    assert not path.exists()


def test_completed_journey_is_retained_for_later_training(tmp_path):
    payload = live()
    payload.update(status="completed", isLive=False)
    assert archive.record_observation(payload, NOW, tmp_path / "history.sqlite3")
    assert exported(tmp_path)[1][0]["data"]["status"] == "completed"


def test_storage_failure_is_fail_open_without_raw_errors(tmp_path, caplog):
    path = tmp_path / "not-a-directory"
    path.write_text("secret-storage-content")
    assert not archive.record_observation(live(), NOW, path / "history.sqlite3")
    assert not archive.record_observation(live(), "not-a-timestamp", tmp_path / "history.sqlite3")
    assert "secret" not in caplog.text


def test_retention_and_count_bound_use_received_time(tmp_path, monkeypatch):
    path = tmp_path / "history.sqlite3"
    old_received = NOW - timedelta(days=181)
    old = live()
    old["lastUpdatedAt"] = old_received.isoformat()
    assert archive.record_observation(old, old_received, path)
    monkeypatch.setattr(archive, "MAX_SNAPSHOTS", 2)
    for minutes in (0, 1, 2):
        payload = live()
        payload["lastUpdatedAt"] = (NOW + timedelta(minutes=minutes)).isoformat()
        assert archive.record_observation(payload, NOW + timedelta(minutes=minutes), path)
    count, rows = exported(tmp_path)
    assert count == 2
    assert [row["observed_at"] for row in rows] == ["2026-10-15T10:03:00Z", "2026-10-15T10:04:00Z"]


def test_export_is_local_atomic_and_never_overwrites_archive_on_error(tmp_path):
    path = tmp_path / "history.sqlite3"
    assert archive.record_observation(live(), NOW, path)
    with pytest.raises(ValueError, match="Unable to export"):
        archive.export_observations(path, path)
    destination = tmp_path / "export.jsonl"
    destination.write_text("previous-good-export")
    with sqlite3.connect(path) as db:
        db.execute("UPDATE eta_observations SET snapshot=?", (b"not-compressed",))
    with pytest.raises(ValueError, match="Unable to export"):
        archive.export_observations(path, destination)
    assert destination.read_text() == "previous-good-export"
    assert not list(tmp_path.glob("*.tmp"))
    assert not archive.record_observation(live(), NOW, "https://example.com/history.sqlite3")
