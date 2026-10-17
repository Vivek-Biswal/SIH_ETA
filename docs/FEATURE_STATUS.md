# What Etaernal currently does

Audited against the source on **17 October 2026**. “Implemented” describes code
that exists; it does not guarantee external-provider availability or accuracy.

| Capability | Status | Scope and evidence |
| --- | --- | --- |
| Train lookup by name/number and station-to-station search | Implemented | Web and native Flutter search; RailRadar or configured database. [Passenger routes](../backend/api/routes/passenger.py), [train routes](../backend/api/routes/trains.py). |
| Running status, ordered stops and selected-station ETA | Implemented | Train number and journey date are checked together. Missing/stale data is identified. [Passenger adapter](../backend/services/railradar_passenger.py). |
| Trained arrival-delay prediction | Limited pilot | Gradient-boosted trees for **12303, 12423, 12624**, subject to event freshness, route, feature and horizon checks. Other observations use an explicit fallback. [Model audit](ETA_MODEL_AUDIT.md). |
| Station-specific explanations | Implemented | Early/on-time/late arrival, current delay, measured recovery and possible future recovery are separated. An unconfirmed cause stays unconfirmed. [Explanation service](../backend/services/arrival_reasons.py). |
| Weather near arrival | Implemented context | OpenWeather forecast at the selected station. Weather is **not** a trained ETA feature or proof of a railway delay. [Weather service](../backend/services/weather_service.py). |
| Selected-train geographic route | Implemented with limits | Leaflet, MapTiler when authorized, OpenStreetMap fallback. Station coordinates may be missing; approximate links are not exact track geometry. Position provenance is displayed. [Route resolver](../apps/web/web_app/src/services/routeGeometry.ts). |
| Continuously refreshed information | Implemented polling | Foreground refresh, shared cache, deduplication and error backoff. “Live” requires a fresh provider report; marker animation is not new GPS evidence. |
| Journey analytics and CSV export | Implemented | One selected journey's comparable, completed station observations. Missing actual times are excluded; this is not nationwide model accuracy monitoring. [Analytics](../apps/web/web_app/src/components/analytics/JourneyAnalytics.tsx). |
| Historical station/inter-train analysis | Implemented, historical | Dated September 2024 analysis: 447 stations and 60,126 recorded interactions. Scores do not prove causal delay propagation or live congestion. [Network adapter](../backend/services/adapters/network_adapter.py). |
| Route simulation | Implemented, illustrative | Loads the selected train's reported timetable, adds a chosen section wait and plays out subsequent arrivals locally. It is not a trained forecast or dispatch optimizer. [Simulation](../apps/web/web_app/src/components/network/RouteSimulation.tsx). |
| Flutter Journey insights parity | Implemented through shared web workspace | Android/iOS WebView hosts tracking, analytics, history and simulation; native Flutter also has historical network views. Requires the deployed website. [Workspace](../apps/mobile/flutter_app/lib/features/network/journey_workspace_screen.dart). |
| Onboarding, saved journeys, appearance settings | Implemented in Flutter | Local preferences; up to 20 saved journeys. No cloud synchronization implied. |
| Station reminder | Device-clock handoff | Opens the phone clock for a user-confirmed alarm. It does not follow later train delays and is not a push notification service. |
| Website journey alerts | Implemented, in-page only | Three explicitly watched journeys, stop-specific delay thresholds, arrival changes, read filters, freshness checks and bounded manual/optional foreground refresh. No network-wide incident or background-push claim. [Alert guide](JOURNEY_ALERTS.md). |
| Native ETA feedback | Implemented in 1.1.10+12 | Local pending queue, retry and idempotent server receipt; unverified reports, not model-training labels. [Delivery note](MOBILE_ETA_FEEDBACK.md). Gallery captures are the preceding 1.1.9+11 release. |
| Offline live tracking | Not implemented | Previously cached information may be available; no new position is produced offline. |
| Nationwide trained ETA coverage | Not implemented | Requires broader representative, dated historical outcomes and prospective evaluation. |
| Operational signals, rake links, platform occupancy and track clearance | Not connected to the ETA model | No verified network-wide feed currently supports these causal claims. |
| Continuous GPS/speed/weather/congestion model inputs | Not trained | Historical training data does not provide aligned evidence for these inputs. |
| Production authentication / authorization | Incomplete | Login/design contracts are not evidence that passenger or compatibility endpoints enforce JWT authorization. Do not expose administrative assumptions through public routes. |
| Historical observation collection | Implemented, local persistence | Sanitized observations reuse successful provider fetches. SQLite files need durable hosting/storage before they can support long-term retraining. |

## Evaluation boundary

The trained pilot passed a retrospective, chronological holdout comparison with
the previous method. That does **not** establish accuracy on all Indian Railways
trains, continuous in-transit observations or future RailRadar reports. See
[the complete evaluation and remaining work](ETA_MODEL_AUDIT.md).

## Legacy interfaces

The repository still contains `/api/*` compatibility routes, mock scenario
providers, an older dashboard summary and research notebooks. Some return
illustrative data. The passenger UI's historical summary uses
`/api/v1/network/insights`; it must not be described using the older summary's
sample “active train” counts. Use the [API guide](api/api-contract.md) when adding
client integrations.
