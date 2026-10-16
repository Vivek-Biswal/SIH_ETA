# Etaernal ETA: audit, training and deployment scope

This document records the real ETA implementation and its limits. Machine
learning training and runtime artifacts are separate from the website's
illustrative delay scenarios and railway simulation.

## What the audit found

The configured RailRadar path used scheduled arrival plus the latest reported
delay. It did not learn recovery or additional delay. The alternative database
provider attempted to call an old baseline wrapper named `eta-xgboost-v1`;
that name was misleading, and the wrapper's output contract was broken. That
legacy interface now declines ML inference because it has no dated running
observation. It retains the existing explicit database/schedule fallback.

Repository timetables contain schedules, not arrival outcomes. A single delay
snapshot, aggregate per-station delay statistics and historical network
interactions cannot establish causal arrival prediction accuracy. The original
notebooks also referenced missing September 2024 route CSVs. Supabase's connected
ETA project was inactive during inspection, so no historical training records
were assumed to exist there.

The passenger interface had also been suggesting congestion from a positive
delay. A delay alone is not evidence of its cause. App and website now display
the actual method, explanation, observation time and model evaluation metadata.
Static examples remain explicitly educational.

## Imported evidence and provenance

Source: [indian-railways-runs by yadavsaurabh](https://huggingface.co/datasets/yadavsaurabh/indian-railways-runs),
pinned to `d131017ee61b65681a1908025b93813169e8fb8f`. The publisher describes
independent collection from the public WhereIsMyTrain status cache and declares
GPL-3.0. These are third-party reported times, not railway-certified or
independently audited ground truth. Preserve that attribution and declared
license when reusing the data or distributing derivatives.

Only train files **12423, 12303 and 12624** were downloaded (about 14 MB), rather
than the entire 34 GB collection. They contain 63,251 retained station events
across 3,134 dated journeys, from 2020 to September 2026. Training uses records
from January 2025 onward to limit timetable and operating-regime drift.

`intelligence/train_eta/reports/source_manifest.json` records each URL, commit,
file SHA-256, exclusions, coverage and the canonical output hash. Raw data and
canonical JSONL stay out of Git. Compatible duplicate records are merged;
conflicting duplicates and future/unconfirmed arrivals are excluded. A source
delay field can clip early arrivals, so labels are derived from explicit dated
actual minus scheduled timestamps instead.

## What is genuinely learned

`intelligence/train_eta/training/train.py` fits a scikit-learn gradient-boosted
regressor with Huber loss. Its target is **future arrival delay minus delay at
the observed station event**. Adding the learned residual to the current delay
is residual ML forecasting: the correction comes from fitted trees and historical
outcomes, rather than a hand-authored recovery formula.

Inputs shared between training and serving:

- Train, current station, target station and arrival/departure landmark.
- Observed delay, prior delay, recent delay mean and delay trend.
- Scheduled travel time to the target and remaining scheduled distance.
- Observed station dwell and scheduled target dwell.
- Month, weekday and time of day.

Features are reconstructed as of each confirmed station arrival/departure.
Future actual arrivals and later departures never enter the inputs. Future
target arrival is used only as the label. A report containing a departure filled
in later is not evidence that departure was known at the arrival landmark.

## Validation and interpretation

Complete service dates are split chronologically into fitting, model selection,
interval calibration and final test periods (approximately 55/15/15/15%). There
is a three-day embargo at boundaries plus explicit label-time purging. A journey
never straddles partitions. Training gives each journey equal total weight.
Three fixed candidate tree configurations are compared on validation MAE only.

The selected model has 200 trees of maximum depth 3. Of 1,324 eligible journeys
since January 2025, 1,300 remain after boundary exclusions: 632 fitting journeys
(2025-01-01–2025-11-28), 219 validation journeys (2025-12-02–2026-02-27), 220
calibration journeys (2026-03-03–2026-05-29) and **229 final-test journeys
(2026-06-02–2026-09-01)**. The final test contains 81,624 correlated station/target
examples; those must not be described as 81,624 independent journeys.

| Final-test method | MAE (minutes) | RMSE (minutes) | P90 absolute error (minutes) |
| --- | ---: | ---: | ---: |
| Timetable unchanged | 41.01 | 78.80 | 105.00 |
| Existing observed-delay baseline | 18.95 | 30.01 | 39.00 |
| Fitted model before serving gates | 15.34 | 27.13 | 31.67 |
| Fixed coverage policy: model + explicit fallback | **15.39** | **27.18** | **31.87** |

The gated policy improves test MAE by **18.8%** and validation MAE by **9.8%**
(27.06 → 24.41 minutes). All three test trains improve: 12303, 24.55 → 18.83;
12423, 22.93 → 19.62; 12624, 11.86 → 9.21 minutes MAE. The raw model's
whole-journey bootstrap improvement interval is 2.89–3.88 minutes (95%).
Both promotion gates passed. JSON export differs from the training library by
less than the required 0.00001-minute parity tolerance.

The policy's route/feature gates cover 96.9% of the held-out **station-landmark
examples**. That is not continuous live coverage: freshness, confirmed-event age,
provider station agreement and missing current data reduce actual serving coverage.

The evaluation compares both the unchanged timetable and the existing
delay-carry-forward baseline on identical observations and labels. Metrics are
arrival MAE, RMSE and 90th percentile absolute error, in minutes. A bootstrap
uses whole journeys rather than correlated station rows. Horizon coverage is
selected using validation results, never final-test errors.

Exact measured results, dates, sample counts, candidates and split membership
are in `backend/data/eta_ml/evaluation.json` and `split_manifest.json`. The
separate `training/audit_policy.py` evaluates the fixed model with its serving
coverage gates and reported-delay fallback; it does not refit or tune on test.
Its metrics are the ones sent to passenger clients.

Promotion requires at least 5% lower validation and test MAE, no material RMSE
regression, a positive lower bound on the journey-bootstrap improvement interval,
and a passing serving-policy audit. A failed artifact is retained for inspection
but never used to claim ML forecasts. An empirical calibration range is recorded
for research; it is not presented as a guaranteed per-arrival confidence.

**Retrospective station-event replay is not prospective RailRadar validation.**
The source's reporting conventions, missingness and timetable can differ from
the production provider. Final-test errors are not a promise for today's arrival.
Raw-model and gated-policy metrics are both retained. Route-order adjustments
and current-location agreement cannot be fully replayed from this dataset.

## Runtime behavior

`backend/services/eta_ml.py` loads a small, versioned JSON tree artifact. It
requires no pickle execution, extra provider requests or scikit-learn runtime
dependency. Exported predictions are checked against the training library before
the artifact is written. Inference runs outside the async API event loop.
`GET /api/v1/eta/model` exposes credential-free model status, historical metrics
and serving coverage without consuming a RailRadar request.

The model is used only for a fresh running observation, one of the three pilot
trains, an ordered route, a supported current/target station pair with sufficient
training examples, a supported forecast horizon and in-range features. It needs
a confirmed station event no more than 15 minutes old. Provider running delay
must agree with that event, and current station must match when supplied. It
declines stale, cancelled, completed and not-started journeys. An evaluation
older than 180 days requires renewed validation.
Reported diversions, rescheduling and partial cancellation also withhold learned
forecasts because these exceptions were not represented as training features.

For other observations, the reported-delay estimate remains clearly identified.
Each stop has its own `prediction_method`; selecting a fallback stop does not
label that arrival as ML. Predicted arrivals remain in route order. Unsupported
inputs, a missing/corrupt model or disabled inference do not break the existing
passenger API. Set `ETA_ML_ENABLED=false` to disable learned serving.

This is a **three-train station-based pilot**, not nationwide or continuous GPS
coverage. Between stations, the fallback can be used frequently until time-aligned
production observations support an independently evaluated in-transit model.

## Passenger explanations at each station

Each ETA stop now includes `arrival_explanation` (`status`, `title`, `summary`,
`details`), `route_sequence`, and a confirmed-only `actual_arrival`. Website and
Flutter clients select the explanation for that exact route occurrence, including
routes that visit the same station twice. These additions preserve existing API
fields and do not make extra provider calls.

The passenger message names the station, gives its dated arrival in IST, and
states whether the train is on time, early or late. Learned forecasts can explain
the expected change from the latest reported delay; simpler estimates explicitly
assume that delay continues. A completed, confirmed extra stop can be described
as an observed fact. None of these establish a signal, congestion, platform or
weather cause: when the feed does not report a verified cause, the message says
the delay reason was not provided.

Future-filled actual timestamps, events ahead of the reported current stop,
ambiguous skipped visits, stale updates and non-running journeys cannot become
current arrival estimates. Confirmed past arrivals remain recorded facts.
Model test statistics are collapsed and shown only for a selected stop that
actually uses the model, never as the accuracy of a fallback estimate.

This changes the explanation and evidence checks; it does not expand the
three-train ML pilot or introduce new operational data sources.

The optional `arrival_explanation.timing` separates reported signed delay,
observed recovered lateness between named stops, and possible future recovery
or added delay. Recovery already achieved compares an earlier confirmed dated
event with the latest report. Available current-event timestamps must agree
with that report; all confirmed arrivals/departures must be chronological.
When no earlier stop is known, a confirmed shorter halt can establish recovery
within that stop. Moving further ahead of schedule is not recovered lateness.

Completed longer halts and slower completed sections can explain measured added
lateness, but do not establish a signal, platform or weather cause. Ongoing
halts are durations **as of the observation**, labelled as possible contributors.
An earlier extra halt is not reused as a current explanation if later confirmed
timings show its added delay was fully recovered.

Possible future recovery comes only from the selected stop's qualified model
forecast and is capped at current positive lateness. Route-order clamps suppress
this claim. Other arrivals explicitly say future recovery is not estimated;
a scheduled halt is not assumed to be disposable recovery time. No reliable
section recovery-buffer or minimum-running-time feed is currently available.
These timing calculations reuse the fetched journey and make no provider calls.

## Missing factors and how to obtain them

| Factor | Available now | What is needed for valid training |
| --- | --- | --- |
| Historical actual arrivals and delay evolution | Imported pilot histories | Broader, licensed histories covering more trains, seasons and routes |
| Station stoppage time | Past confirmed dated arrival/departure | Consistent actual-event reporting across providers |
| Current speed/GPS | Some live observations may include telemetry | Timestamped historical telemetry paired with later actual arrivals |
| Weather | OpenWeather context in the existing application | Weather forecasts archived **as issued** at prediction time, plus later actual outcomes; realized future weather alone would leak information |
| Traffic, signal waits, track clearance | No authoritative live occupancy/signal feed | A permitted operational feed with timestamped events and track/section identity |
| Maintenance and speed restrictions | Not supplied as reliable training events | Dated section restrictions, their validity periods and historic arrival labels |
| Forecast accuracy in production | New observations can be archived | Prospective predictions logged before outcomes, matching later confirmed arrivals, and monitored drift |

OpenWeather access alone does not justify adding a fixed number of delay minutes.
Weather stays contextual until measured training evidence demonstrates benefit.
The simulation's congestion and mitigation values are never training labels.

## Quota-saving data collection and durability

`services/eta_observations.py` saves whitelisted, compressed provider observations
only after an already-required successful live fetch. Cache hits are not fetched
again for ML. No API keys, authorization headers or arbitrary payload fields are
stored. Provider timestamps deduplicate observations. The archive is bounded to
20,000 snapshots and 180 days; storage errors do not block ETA responses.

Default: `ETA_HISTORY_PATH=data/eta-observations.sqlite3`. The current Render
service is on the free plan with an ephemeral filesystem. **This archive is not
durable across redeploys/restarts.** A persistent storage service or an active
database is required before it can serve as a dependable long-term dataset.
No paid resources or schema changes were created automatically.

To export locally, run in `backend` with its environment:

```python
from services.eta_observations import export_observations
export_observations('data/eta-observations.sqlite3', 'data/eta-history.jsonl')
```

Exported observations are evidence for future training, not automatically trusted
labels. Match snapshots to later confirmed arrivals, exclude stale and future
populated actual fields, deduplicate services, and use the same chronological
evaluation before replacing the model. A prospective prediction/outcome ledger
and a production-provider retraining pipeline remain follow-up work.

## Reproduce

Use Python 3.12 with `intelligence/train_eta/training/requirements.txt` in a
separate training environment. The Windows Python 3.14 SciPy build encountered
an application-control DLL rejection during this run; no policy was disabled.
The local Flutter SDK also has a tool snapshot/Gradle plugin filtering mismatch:
the generated Android registrant included the test-only integration plugin in a
release build. For this APK, the ignored generated test registration was removed
and the release was assembled with the project's Gradle wrapper. No test plugin
was added to the production dependencies. Align the installed Flutter SDK's tool
snapshot and source versions before relying on automated release builds there.

```text
python intelligence/train_eta/data/import_public_history.py
python intelligence/train_eta/training/train.py
python intelligence/train_eta/training/audit_policy.py
```

Commit the JSON model, evaluation, split manifest, code and source attribution,
not raw data or executable pickle artifacts. Production uses only standard
library inference. Both audit commands must complete before enabling a newly
trained artifact.
