# Passenger API guide

The **running FastAPI application** generates the current endpoint schemas:

- [Hosted Swagger UI](https://sih-eta-backend-a819.onrender.com/docs)
- [Hosted OpenAPI JSON](https://sih-eta-backend-a819.onrender.com/openapi.json)
- Local equivalents: `http://localhost:8000/docs` and `/openapi.json`

The [original shared YAML](../../shared/api_contracts/api-contract.yaml) is an
earlier design proposal. It is not generated from the running API and its JWT,
prediction and payload descriptions must not be assumed implemented.

## Base URLs and authentication

Website variable `NEXT_PUBLIC_API_BASE_URL` includes `/api/v1`. Flutter's
`API_BASE_URL` is the root origin and derives `/api` and `/api/v1` internally.

Current passenger routes do not enforce universal bearer-JWT authentication.
Private upstream keys are used by the server only; clients must never send a
RailRadar or weather key. Prototype compatibility routes are not a secure
administrative control plane.

## Main endpoints

Paths below are relative to `/api/v1`, except `/health`.

| Method | Path | Input / purpose |
| --- | --- | --- |
| GET | `/health` (root) | Application process health; does not check provider quota |
| GET | `/eta/model` | Credential-free artifact status, pilot scope and historical evaluation; no provider call |
| GET | `/passenger/lookup` | `q`: train name/number, at least 2 characters |
| GET | `/stations/search` | `q`: station lookup; inspect runtime schema for constraints |
| GET | `/stations/{station_code}` | Station detail from the configured source |
| GET | `/trains/search` | `from_station`, `to_station`, optional `date`, `page`, `limit` |
| GET | `/trains/{train_number}/status` | Optional origin journey `date`; ordered route and reported position |
| GET | `/trains/{train_number}/eta` | Same journey `date`; station-specific arrival predictions and explanations |
| GET | `/trains/{train_number}/weather` | Required `station_code`, optional journey `date`; forecast context |
| GET | `/passenger/departures/{station_code}` | Scheduled board; inspect `board_type`/`live_available`, not assumed live departures |
| GET | `/network/insights` | Optional station/train `q`, bounded `limit`; dated historical patterns |
| POST | `/passenger/eta-feedback` | Validated passenger report with idempotent report identifier; returns a receipt. Reports are unverified, not actual-arrival labels. See runtime schema. |

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/eta/model
```

Train-data calls consume provider allowance on an uncached request. Resolve and
reuse the same origin date across status, ETA and weather. Do not attach browser
timers to directory/timetable endpoints or retry aggressively after quota errors.

## Response fields clients must preserve

| Field | Interpretation |
| --- | --- |
| `train_number`, `date` | Identity of the origin journey; reject mismatched responses |
| `data_source` | `live`, `cached`, `database` or other explicitly identified source; not a model name |
| Observation/retrieval timestamps | Source freshness; a new response time does not make an old report live |
| `route` / `remaining_stations` | Ordered stops; keep route occurrence/sequence when a station repeats |
| Per-stop `scheduled_arrival` | Timetable timestamp |
| Per-stop `actual_arrival` | Confirmed observed arrival, when available; never infer it from an estimate |
| Per-stop `predicted_arrival` | ETA when supported; can be missing |
| Per-stop `prediction_method` | `inference`, `delay_adjusted`, `schedule_only` or an explicit unavailable/actual state; use the returned value |
| `arrival_explanation` | Selected-stop status/title/summary/details plus available timing evidence |
| Model metadata | Artifact status and historical evaluation, not a guarantee for the selected arrival |

Top-level `prediction_method` can summarize a mixed-method response. It does not
override the selected stop's method. Null confidence is unknown; do not display
an invented probability. Display IST times consistently and retain dates for
multi-day journeys.

### Delay and recovery evidence

The explanation timing payload can include signed `current_delay_minutes`
(positive = late, negative = early), `recovered_minutes`, the named recovery
station span, `expected_recovery_minutes`, `expected_additional_delay_minutes`
and a future-recovery status. These are different quantities: minutes already
recovered are observed comparisons, while possible future recovery is an
estimate only when qualified prediction evidence supports it.

An observed longer halt or slower section can explain where time was lost.
Neither confirms a signal failure, obstruction or weather cause. Missing
evidence must remain unavailable/unconfirmed. See
[the explanation service](../../backend/services/arrival_reasons.py) and
[recovery tests](../../backend/tests/unit/test_arrival_recovery.py).

## Failure behavior and compatibility

Input validation can return 422; missing trains/stations can return 404. Provider
quota, network, stale-data and configuration failures may return unavailable
responses or bounded cached data. Read the actual HTTP status/body and use
controlled retry/backoff; do not classify all failures as “train not found.”

Older `/api/*` endpoints include scenario, delay-DNA, recovery and propagation
interfaces with mock/illustrative providers. `/api/v1/dashboard/*` also retains
older sample summaries. They must not be used as verified live evidence.
New passenger integrations should follow the versioned routes above, source
adapters and focused tests rather than copying legacy examples.

No universal response-envelope shape is promised: adapters normalize these
routes in [the website](../../apps/web/web_app/src/services/passenger.ts) and
[Flutter](../../apps/mobile/flutter_app/lib/core/services/train_repository.dart).
