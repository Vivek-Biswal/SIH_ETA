"""
Integration tests for the FastAPI API endpoints.

Uses httpx ASGITransport to test the full request/response cycle against
the actual FastAPI app with mocked service layers.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, MagicMock

from main import app
from models.schemas.trains import (
    TrainSearchResponse,
    TrainStatusResponse,
    ETAResponse,
)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ── Train Search ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_trains_requires_params(client):
    """GET /api/v1/trains/search without required params should return 422."""
    response = await client.get("/api/v1/trains/search")
    assert response.status_code == 422


# ── Train Status ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("repositories.train_repository.TrainRepository.get_train_by_number")
async def test_train_not_found_returns_404(mock_get_train, client):
    """Requesting a train that doesn't exist should return 404."""
    mock_get_train.return_value = None

    response = await client.get("/api/v1/trains/99999/status")
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "NOT_FOUND"


# ── Frontend Compatibility: Delay DNA ─────────────────────────────────────


@pytest.mark.asyncio
async def test_delay_dna_endpoint(client):
    """GET /api/trains/{id}/delay-dna should return mock Delay DNA data."""
    response = await client.get("/api/trains/12301/delay-dna")
    assert response.status_code == 200
    data = response.json()
    assert data["train_id"] == "12301"
    assert "contributors" in data


# ── Frontend Compatibility: Recovery ──────────────────────────────────────


@pytest.mark.asyncio
async def test_recovery_endpoint(client):
    """GET /api/trains/{id}/recovery should return mock recovery data."""
    response = await client.get("/api/trains/12301/recovery")
    assert response.status_code == 200
    data = response.json()
    assert "current_delay" in data
    assert "expected_recovery" in data


# ── Frontend Compatibility: Propagation ───────────────────────────────────


@pytest.mark.asyncio
async def test_propagation_endpoint(client):
    """GET /api/trains/{id}/propagation should return mock propagation data."""
    response = await client.get("/api/trains/12301/propagation")
    assert response.status_code == 200
    data = response.json()
    assert data["source_train"] == "12301"


# ── Frontend Compatibility: Bottlenecks ───────────────────────────────────


@pytest.mark.asyncio
async def test_bottlenecks_endpoint(client):
    """GET /api/network/bottlenecks should return a list."""
    response = await client.get("/api/network/bottlenecks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


# ── Frontend Compatibility: What-If ──────────────────────────────────────


@pytest.mark.asyncio
async def test_what_if_endpoint(client):
    """POST /api/what-if should accept a scenario and return results."""
    payload = {"scenario_type": "speed_restriction", "parameters": {"speed": 30}}
    response = await client.post("/api/what-if", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "scenario_id" in data
    assert data["status"] == "completed"


# ── Frontend Compatibility: Simulation ────────────────────────────────────


@pytest.mark.asyncio
async def test_simulation_endpoint(client):
    """POST /api/simulation should accept and return a scenario."""
    payload = {"scenario_id": "sim_test", "parameters": {"trains": 10}}
    response = await client.post("/api/simulation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scenario_id"] == "sim_test"


# ── WebSocket ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_websocket_connection():
    """The WebSocket endpoint should accept connections and send a welcome event."""
    from fastapi.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws/trains/live") as websocket:
        data = websocket.receive_json()
        assert data["event_type"] == "INFO"
        assert data["message"] == "Connected to SIH ETA Telemetry Stream"


# ── Health Check ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """GET /health should return 200."""
    response = await client.get("/health")
    assert response.status_code == 200
