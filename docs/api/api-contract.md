# API Contract Reference — SIH ETA

This document is the human-readable companion to [`api-contract.yaml`](api-contract.yaml).

The machine-readable OpenAPI spec is the **authoritative source**. This document explains rationale, integration notes, and examples.

> **Interactive API docs** are available at `http://localhost:8000/docs` when the backend is running.

---

## Base URL

| Environment | URL |
|---|---|
| Development | `http://localhost:8000` |
| Production | `https://api.sih-eta.example.com` (TBD) |

All API endpoints are versioned: `/api/v1/<resource>`

---

## Authentication

All endpoints (except `/health` and `/api/v1/auth/*`) require a JWT Bearer token.

```
Authorization: Bearer <access_token>
```

Obtain a token via `POST /api/v1/auth/login`.

---

## Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |
| POST | `/api/v1/auth/login` | Login, get JWT tokens |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/trains/search` | Search trains by source/dest |
| GET | `/api/v1/trains/{train_no}/status` | Live running status |
| GET | `/api/v1/trains/{train_no}/eta` | ML-predicted ETA |
| GET | `/api/v1/stations/{code}` | Station details |
| GET | `/api/v1/stations/search` | Station search |
| GET | `/api/v1/network/status` | Network congestion overview |
| GET | `/api/v1/network/routes/{id}/congestion` | Route-specific congestion |
| WS | `/ws/trains/{train_no}/live` | Real-time train position stream |

---

## Key Contract Types

### `ETAResponse`

The core response from `GET /api/v1/trains/{train_no}/eta`:

```json
{
  "train_number": "12301",
  "train_name": "Howrah Rajdhani Express",
  "date": "2026-09-05",
  "prediction_generated_at": "2026-09-05T14:30:00Z",
  "model_version": "eta-xgboost-v1.2",
  "overall_delay_minutes": 22,
  "confidence_score": 0.87,
  "remaining_stations": [
    {
      "station": { "code": "CNB", "name": "Kanpur Central" },
      "scheduled_arrival": "2026-09-05T19:30:00+05:30",
      "predicted_arrival": "2026-09-05T19:52:00+05:30",
      "predicted_delay_minutes": 22,
      "prediction_confidence": 0.91
    }
  ],
  "delay_factors": [
    {
      "factor": "network_congestion",
      "contribution_minutes": 15,
      "description": "High congestion on NDLS-CNB corridor"
    },
    {
      "factor": "historical_delay",
      "contribution_minutes": 7,
      "description": "Train historically runs 7 min late on Thursdays"
    }
  ]
}
```

---

## Contract Change Process

> ⚠️ **Changing the API contract affects ALL teams.**

1. Raise the change in team discussion first
2. Update `api-contract.yaml` with the proposed changes
3. Mark breaking changes with a `[BREAKING]` comment
4. Open a PR with `[Shared]` prefix tagging all team leads
5. Version bump required for any breaking change (`v1` → `v2`)
6. Update this document with examples

---

## WebSocket Protocol

`/ws/trains/{train_number}/live`

**Message format (server → client):**

```json
{
  "type": "position_update",
  "train_number": "12301",
  "timestamp": "2026-09-05T14:35:10Z",
  "current_station": {
    "code": "ALD",
    "name": "Prayagraj Junction"
  },
  "delay_minutes": 18,
  "next_station": {
    "code": "CNB",
    "name": "Kanpur Central"
  },
  "predicted_next_arrival": "2026-09-05T19:55:00+05:30"
}
```
