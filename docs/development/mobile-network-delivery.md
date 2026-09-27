# Network Intelligence delivery

The mobile Network tab uses the additive public endpoint:

`GET /api/v1/network/insights?q=NDLS&limit=50`

`q` accepts a station code or train number (up to 20 alphanumeric/space characters). Empty query returns network-wide analysis. The maximum limit is 100. Counts cover all matching records; lists contain the highest-ranked matches up to the requested limit. Station cards use bottleneck-score order; interactions use descending propagation-model score, then service date.

## Data provenance

The service reads `notebooks/outputs/network_bottlenecks.csv` and `operational_risk.csv`. The repository currently contains September 2024 analysis: 447 stations and 60,126 recorded interactions. Responses declare `data_source=historical`, `live_available=false`, and the actual minimum/maximum service dates. No current network-wide health or confirmed disruptions are inferred from these records. Model scores are not labelled as calibrated probabilities. No confidence is fabricated.

The file loader validates finite values, dates and train identifiers, pads four-digit train numbers, and caches one snapshot by file signature for at most 60 seconds. Replacing published analysis invalidates the cache. Missing/corrupt analysis returns HTTP 503 rather than a healthy zero network. CSV work runs in FastAPI's synchronous endpoint thread pool.

Set `NETWORK_ANALYSIS_DIR` if the files are mounted elsewhere. On Render's native Python service, keep the full Git checkout so the sibling notebooks directory is available. A backend-only Docker context must mount/copy these analysis files and set that environment variable; the service does not download or invent substitutes.

The compatibility provider's incorrect repository root was also repaired. Its CSV-derived propagation/bottleneck responses now use cached/unavailable states rather than live.

## Deployment checks

1. Deploy the changed backend source together with the already tracked notebooks outputs.
2. Confirm `/health` returns 200.
3. Confirm `/api/v1/network/insights?limit=1` returns historical provenance and the actual analysis period.
4. Confirm a station query (NDLS) and train query return matching records; an unknown query returns empty lists, not an error.
5. Open Network in the new APK, search, drill into a station, switch to propagation and open latest train status.

Tests: run `.\venv\Scripts\python.exe -m pytest tests -q` from `backend`.

## Remaining problem-statement work

A live network-wide observation/incident feed is not configured. The currently deployed live train ETA is an observed-delay baseline. Learned multi-station ETA, validated uncertainty, real-time signal/congestion/weather/restriction ingestion and production-scale performance require their own integration and evaluation; the app does not claim these are complete.
