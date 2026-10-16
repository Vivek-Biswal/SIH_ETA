import sqlite3
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.routes.feedback import router
from config.settings import settings


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "ETA_FEEDBACK_PATH", str(tmp_path / "feedback.sqlite3"))
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        yield client


def report(**changes):
    return dict(report_id="a" * 32, train_number="12423", journey_date="2026-10-15",
                station_code="NDLS", route_sequence=391, rating="inaccurate",
                reason="train_delayed", comment="Arrived later than expected.",
                predicted_arrival="2026-10-17T13:30:00+05:30", **changes)


def test_feedback_is_recorded_as_unverified_and_retry_is_idempotent(client):
    for _ in range(2):
        response = client.post("/api/v1/passenger/eta-feedback", json=report())
        assert response.status_code == 201
        assert response.json() == {"report_id": "a" * 32, "status": "received", "verified": False}
    with sqlite3.connect(settings.ETA_FEEDBACK_PATH) as db:
        assert db.execute("SELECT COUNT(*) FROM passenger_eta_feedback").fetchone()[0] == 1
    assert client.get("/api/v1/passenger/eta-feedback").status_code == 405


def test_conflicting_reuse_of_report_id_never_overwrites_original(client):
    client.post("/api/v1/passenger/eta-feedback", json=report())
    changed = report(); changed["rating"] = "accurate"
    assert client.post("/api/v1/passenger/eta-feedback", json=changed).status_code == 409


@pytest.mark.parametrize("field,value", [("train_number", "123"), ("journey_date", "2026-02-30"),
    ("station_code", "../NDLS"), ("report_id", "bad"), ("rating", "verified"),
    ("comment", "x" * 501), ("route_sequence", -1),
    ("predicted_arrival", "2026-10-17T13:30:00"), ("admin", True)])
def test_malformed_feedback_is_rejected(client, field, value):
    payload = report(); payload[field] = value
    assert client.post("/api/v1/passenger/eta-feedback", json=payload).status_code == 422


def test_storage_failure_is_not_reported_as_success(client, monkeypatch):
    monkeypatch.setattr(settings, "ETA_FEEDBACK_PATH", "\0invalid")
    # Invalid paths must also produce the same safe unavailable response.
    response = client.post("/api/v1/passenger/eta-feedback", json=report())
    assert response.status_code == 503


def test_concurrent_retries_keep_one_record(client):
    with ThreadPoolExecutor(max_workers=4) as pool:
        codes = list(pool.map(lambda _: client.post("/api/v1/passenger/eta-feedback", json=report()).status_code, range(8)))
    assert codes == [201] * 8
