# Backend Handoff Contract (For VARUN)

This document outlines how the core ETA computational system (Group A) integrates with the backend infrastructure.

## 1. Core System Architecture

Group A provides a stateless computational core located in `src/system/orchestrator.py`. 
It does not manage databases, HTTP servers, or background scheduled tasks.

## 2. Entry Point

The primary entry point is the `ETAOrchestrator` class.

```python
from system.orchestrator import ETAOrchestrator
from state.builder import TrainStateBuilder

# Initialization (do this once on server startup)
builder = TrainStateBuilder(trains_lookup, journeys_lookup, historical_lookup)
orchestrator = ETAOrchestrator(builder, journeys_lookup)

# Processing a request
response_dict = orchestrator.process_request({
    "train_number": "12001",
    "destination_station": "NDLS",
    "current_delay_minutes": 15
})
```

## 3. Data Contracts

- **Request Format:** See `eta_request_contract.md`
- **Response Format:** See `eta_response_contract.md`

## 4. Prediction Methods

The orchestrator dynamically selects the prediction method:
- `SCHEDULE_BASELINE`: Used when no live delay is available.
- `DELAY_ADJUSTED_BASELINE`: Used when a valid `current_delay_minutes` is passed in the request.

## 5. Required Backend Integration Points

To run the orchestrator, the backend must provide:
1. **In-memory data structures** (lookups) loaded from the processed datasets (`trains_clean.json`, `journeys_scheduled.json`).
2. **An API route** (e.g., `POST /api/v1/eta`) that parses client requests, extracts parameters, and calls `orchestrator.process_request()`.
3. **Live Data fetching:** The backend should ideally fetch the current live delay from a database or external API and inject it into the `current_delay_minutes` field of the request.

## 6. Current Limitations

- **No ML Model:** The system currently provides deterministic baselines. Do not expose "AI Prediction" in the API schema.
- **No DA323 Usage:** Historical aggregated DA323 data is temporally unsafe and is intentionally ignored during ETA calculation. Do not force it into the prediction logic.
- **Stateless:** The orchestrator does not remember past requests.
