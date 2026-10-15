"""Request-budget behavior, using fake provider responses and isolated caches."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Event, Lock

import httpx
import pytest
from fastapi import HTTPException

from services import railradar_requests as provider


KEY_A = "fixture-key-alpha"
KEY_B = "fixture-key-bravo"


def response(status=200, data=None, *, code=None, headers=None):
    payload = {"success": True, "data": data if data is not None else {"value": 1}}
    if status >= 400:
        payload = {"success": False, "error": {"code": code or "PROVIDER_ERROR",
                   "message": "Private provider response " + KEY_A}}
    return httpx.Response(status, json=payload, headers=headers or {},
                          request=httpx.Request("GET", "https://api.railradar.in/v1/fixture"))


@pytest.fixture
def clock(monkeypatch):
    seconds = [1_800_000_000.0]
    monkeypatch.setattr(provider, "time", lambda: seconds[0])
    return seconds


@pytest.fixture
def cache_path(tmp_path):
    return str(tmp_path / "requests.sqlite3")


def test_equivalent_requests_share_cache_and_callers_cannot_mutate_it(monkeypatch, cache_path, clock):
    calls = []

    def fake_get(*args, **kwargs):
        calls.append(kwargs)
        return response(data={"route": [{"code": "AAA"}]})

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    manager = provider.RequestManager(cache_path, [KEY_A])
    result = manager.request("lookup/search/trains", {"q": "express", "limit": 20}, ttl=120)
    result["route"][0]["code"] = "MUTATED"
    cached = manager.request("lookup/search/trains", {"limit": 20, "q": "express"}, ttl=120)

    assert cached == {"route": [{"code": "AAA"}]}
    assert len(calls) == 1


def test_cache_survives_a_new_manager_instance(monkeypatch, cache_path, clock):
    calls = []
    monkeypatch.setattr(provider.httpx, "get", lambda *a, **k: calls.append(k) or response(data=[{"code": "AAA"}]))
    first = provider.RequestManager(cache_path, [KEY_A])
    assert first.request("stations", ttl=3600) == [{"code": "AAA"}]

    restarted = provider.RequestManager(cache_path, [KEY_A])
    assert restarted.request("stations", ttl=3600) == [{"code": "AAA"}]
    assert len(calls) == 1


def test_simultaneous_requests_only_fetch_once(monkeypatch, cache_path, clock):
    calls = []
    call_lock = Lock()
    ready = Barrier(7)
    upstream_entered = Event()
    release_upstream = Event()

    def fake_get(*args, **kwargs):
        with call_lock:
            calls.append(kwargs)
        upstream_entered.set()
        assert release_upstream.wait(timeout=5)
        return response(data={"route": [{"code": "AAA"}]})

    def load():
        ready.wait(timeout=5)
        return manager.request("trains/12301/live", {"date": "2026-10-15"}, ttl=120)

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    manager = provider.RequestManager(cache_path, [KEY_A])
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(load) for _ in range(6)]
        ready.wait(timeout=5)
        try:
            assert upstream_entered.wait(timeout=5)
        finally:
            release_upstream.set()
        results = [future.result(timeout=5) for future in futures]

    assert len(calls) == 1
    assert all(result == results[0] for result in results)
    results[0]["route"][0]["code"] = "CHANGED"
    assert results[1]["route"][0]["code"] == "AAA"


@pytest.mark.parametrize("quota_code", ["QUOTA_EXCEEDED", "MONTHLY_QUOTA_EXCEEDED"])
def test_confirmed_quota_exhaustion_switches_sequentially_and_stays_on_next_key(
        monkeypatch, cache_path, clock, quota_code):
    keys_used = []

    def fake_get(*args, **kwargs):
        key = kwargs["headers"]["Authorization"]
        keys_used.append(key)
        return response(429, code=quota_code) if key == "Bearer " + KEY_A else response()

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    manager = provider.RequestManager(cache_path, [KEY_A, KEY_B])
    assert manager.request("first", ttl=120) == {"value": 1}
    assert manager.request("second", ttl=120) == {"value": 1}
    assert keys_used == ["Bearer " + KEY_A, "Bearer " + KEY_B, "Bearer " + KEY_B]


def test_temporary_rate_limit_pauses_pool_without_rotating(monkeypatch, cache_path, clock):
    keys_used = []

    def fake_get(*args, **kwargs):
        keys_used.append(kwargs["headers"]["Authorization"])
        return response(429, code="RATE_LIMIT_EXCEEDED", headers={"Retry-After": "60"}) if len(keys_used) == 1 else response()

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    manager = provider.RequestManager(cache_path, [KEY_A, KEY_B])
    for path in ["first", "second"]:
        with pytest.raises(HTTPException) as error:
            manager.request(path)
        assert error.value.status_code == 503
    assert keys_used == ["Bearer " + KEY_A]

    clock[0] += 61
    assert manager.request("third") == {"value": 1}
    assert keys_used == ["Bearer " + KEY_A, "Bearer " + KEY_A]


def test_invalid_credential_is_disabled_across_restart(monkeypatch, cache_path, clock):
    keys_used = []

    def fake_get(*args, **kwargs):
        key = kwargs["headers"]["Authorization"]
        keys_used.append(key)
        return response(401) if key == "Bearer " + KEY_A else response()

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    assert provider.RequestManager(cache_path, [KEY_A, KEY_B]).request("first") == {"value": 1}
    assert provider.RequestManager(cache_path, [KEY_A, KEY_B]).request("second") == {"value": 1}
    assert keys_used == ["Bearer " + KEY_A, "Bearer " + KEY_B, "Bearer " + KEY_B]


def test_all_keys_exhausted_opens_circuit_across_requests_and_restart(monkeypatch, cache_path, clock):
    calls = []
    monkeypatch.setattr(provider.httpx, "get", lambda *a, **k: calls.append(k) or response(429, code="QUOTA_EXCEEDED"))
    manager = provider.RequestManager(cache_path, [KEY_A, KEY_B])
    for active_manager in [manager, manager, provider.RequestManager(cache_path, [KEY_A, KEY_B])]:
        with pytest.raises(HTTPException) as error:
            active_manager.request("trains/12301/live")
        assert error.value.status_code == 503
        assert KEY_A not in str(error.value.detail)
        assert KEY_B not in str(error.value.detail)
        assert "Private provider" not in str(error.value.detail)
    assert len(calls) == 2


def test_pool_pause_is_persisted_across_restart(monkeypatch, cache_path, clock):
    calls = []
    monkeypatch.setattr(provider.httpx, "get", lambda *a, **k: calls.append(k) or response(429, headers={"Retry-After": "60"}))
    with pytest.raises(HTTPException):
        provider.RequestManager(cache_path, [KEY_A, KEY_B]).request("first")
    with pytest.raises(HTTPException):
        provider.RequestManager(cache_path, [KEY_A, KEY_B]).request("second")
    assert len(calls) == 1


def test_invalid_payload_is_not_cached(monkeypatch, cache_path, clock):
    calls = []

    def fake_get(*args, **kwargs):
        calls.append(kwargs)
        return response(data={"value": "wrong" if len(calls) == 1 else 42})

    def validate(data):
        if data.get("value") != 42:
            raise ValueError("Contract mismatch")

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    manager = provider.RequestManager(cache_path, [KEY_A])
    with pytest.raises(HTTPException) as error:
        manager.request("first", validate=validate)
    assert error.value.status_code == 503
    clock[0] += 31  # Invalid provider data also triggers the short failure cooldown.
    assert manager.request("first", validate=validate) == {"value": 42}
    assert len(calls) == 2


def test_stale_fallback_is_marked_and_does_not_replace_last_good_snapshot(monkeypatch, cache_path, clock):
    calls = []

    def fake_get(*args, **kwargs):
        calls.append(kwargs)
        return response(data={"route": [{"code": "AAA"}]}) if len(calls) == 1 else response(503)

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    manager = provider.RequestManager(cache_path, [KEY_A])
    assert manager.request("first", ttl=120, stale_ttl=600) == {"route": [{"code": "AAA"}]}
    clock[0] += 121
    stale = manager.request("first", ttl=120, stale_ttl=600)
    assert stale["_railradar_stale"] is True
    assert stale["route"] == [{"code": "AAA"}]
    stale["route"][0]["code"] = "MUTATED"
    assert manager.request("first", ttl=120, stale_ttl=600)["route"] == [{"code": "AAA"}]

    clock[0] += 1000
    with pytest.raises(HTTPException):
        manager.request("first", ttl=120, stale_ttl=600)


def test_stale_data_is_never_returned_without_opt_in(monkeypatch, cache_path, clock):
    calls = []
    monkeypatch.setattr(provider.httpx, "get", lambda *a, **k: calls.append(k) or (response() if len(calls) == 1 else response(503)))
    manager = provider.RequestManager(cache_path, [KEY_A])
    manager.request("first", ttl=120)
    clock[0] += 121
    with pytest.raises(HTTPException) as error:
        manager.request("first", ttl=120)
    assert error.value.status_code == 503


def test_transport_failures_do_not_leak_keys_or_rotate_credentials(monkeypatch, cache_path, clock):
    calls = []

    def fake_get(*args, **kwargs):
        calls.append(kwargs)
        raise httpx.ConnectError("Private transport failure " + KEY_A)

    monkeypatch.setattr(provider.httpx, "get", fake_get)
    with pytest.raises(HTTPException) as error:
        provider.RequestManager(cache_path, [KEY_A, KEY_B]).request("first")
    assert error.value.status_code == 503
    assert KEY_A not in str(error.value.detail)
    assert "Private transport" not in str(error.value.detail)
    assert len(calls) == 1


def test_access_restriction_does_not_rotate_to_another_account(monkeypatch, cache_path, clock):
    calls = []
    monkeypatch.setattr(provider.httpx, "get", lambda *a, **k: calls.append(k) or response(403))
    manager = provider.RequestManager(cache_path, [KEY_A, KEY_B])
    with pytest.raises(HTTPException) as error:
        manager.request("restricted")
    assert error.value.status_code == 503
    assert len(calls) == 1


def test_missing_record_does_not_fall_back_to_stale_or_rotate(monkeypatch, cache_path, clock):
    calls = []
    monkeypatch.setattr(provider.httpx, "get", lambda *a, **k: calls.append(k) or (response() if len(calls) == 1 else response(404)))
    manager = provider.RequestManager(cache_path, [KEY_A, KEY_B])
    manager.request("trains/12301/live", ttl=120)
    clock[0] += 121
    with pytest.raises(HTTPException) as error:
        manager.request("trains/12301/live", ttl=120, stale_ttl=3600)
    assert error.value.status_code == 404
    assert len(calls) == 2
