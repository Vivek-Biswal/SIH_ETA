# Delay Analysis

## 1. Objective
To build an honest analytical framework characterizing the delay patterns observable in the current SIH Indian Train ETA dataset, while explicitly bounding what can and cannot be claimed scientifically.

## 2. Definition of Delay-DNA
See [`delay_dna_definition.md`](delay_dna_definition.md).

In brief: **Delay-DNA** is a structured analytical profile combining observed snapshot delays, historical aggregated station context, and static route characteristics. It is descriptive — not a predictive ML feature set.

## 3. Available Delay Data

| Dataset | Type | Records | Stations | Status |
|---|---|---|---|---|
| `delays_clean.json` | Observed Current Snapshot | 444 | — | Single snapshot |
| `public_historical_delay_clean.csv` (DA323) | Historical Aggregated | 1,479 rows | 270 unique | TEMPORALLY_UNKNOWN |

## 4. Current Delay Snapshot

> [!NOTE]
> `delays_clean.json` is a **single timestamped snapshot**, not a historical time series.

**Summary (from `reports/delay_analysis/current_delay_summary.csv`):**

| Metric | Value |
|---|---|
| Total records | 444 |
| Valid delay observations | 425 |
| Missing delay | 19 (4.28%) |
| Cancelled trains | 19 |
| Min delay | 5 min |
| Max delay | 707 min |
| Mean delay | 77.3 min |
| Median delay | 38 min |
| P75 delay | 99 min |
| P90 delay | 206 min |

**Delay Categories (analytical bins — not official IR categories):**

| Category | Range | Count | % |
|---|---|---|---|
| Low | 1–15 min | 111 | 26.1% |
| Moderate | 16–60 min | 160 | 37.6% |
| High | 61–180 min | 101 | 23.8% |
| Severe | > 180 min | 53 | 12.5% |

## 5. Historical Aggregated Delay Context (DA323)

> [!CAUTION]
> DA323 has UNKNOWN temporal provenance. It cannot be used as a leakage-safe ML feature.

| Metric | Value |
|---|---|
| Total rows | 1,479 |
| Unique stations | 270 |
| Mean avg delay | 122.7 min |
| Median avg delay | 95 min |
| Mean % right-time | 25.2% |
| Mean % significant delay | 45.7% |

## 6. Station Delay Context

Station coverage join:
- Scheduled journey stations: 8,539 unique codes
- DA323-covered stations: 264
- **Match rate: 3.09%**

> [!WARNING]
> Only 3.09% of the stations present in scheduled journeys have DA323 historical context. Do not assume general coverage.

## 7. Route Delay Context

Descriptive association between route distance and current delay:
- **Pearson r = 0.134** (weak positive association)
- Based on 208 matched train observations
- **This is descriptive only.** "Long routes are associated with slightly higher delays in the current snapshot" is the correct interpretation.
- "Long routes CAUSE delays" is NOT a valid conclusion.

## 8. Delay-DNA Profile

See [`delay_dna_examples.md`](delay_dna_examples.md) for worked examples.

Each profile contains four sections:
1. Current observed delay (OBSERVED_CURRENT)
2. Historical aggregated context (HISTORICAL_AGGREGATED)
3. Static route context (STATIC_CONTEXT)
4. Missing/unavailable fields explicitly marked

## 9. Data Availability Classification

See `reports/delay_analysis/delay_feature_registry.csv` for the full registry.

| Field | Category | Available | ML Safe |
|---|---|---|---|
| `current_delay_minutes` | OBSERVED_CURRENT | YES | NO (single snapshot) |
| `historical_avg_delay` | HISTORICAL_AGGREGATED | YES | NO (temporal unknown) |
| `route_distance` | STATIC_CONTEXT | YES | YES |
| `actual_arrival_time` | NOT_AVAILABLE | NO | N/A |

## 10. Recovery Analysis

**Status: FRAMEWORK READY, COMPUTATION BLOCKED.**

Recovery analysis cannot be performed on the current dataset because we have only a single timestamped delay observation per train. Recovery requires a T1 → T2 sequence per train per journey.

See [`recovery_analysis_plan.md`](recovery_analysis_plan.md) for the future requirements.

## 11. Analytical Findings

1. The current snapshot has a heavily right-skewed delay distribution (median 38 min, max 707 min).
2. 12.5% of observed trains have severe delay (>180 minutes) at snapshot time.
3. Only 26.1% have "low" delay (≤15 min).
4. DA323 shows consistently pessimistic historical statistics — only 25% of arrivals were right-time on average.
5. The descriptive association between route distance and delay is weak (r=0.134).

## 12. Limitations

- `delays_clean.json` is a **single snapshot** collected at one point in time. It cannot represent delay evolution.
- DA323 temporal provenance is unknown — it may overlap with or extend past the snapshot period.
- Only 3% of scheduled stations have DA323 coverage.
- No GPS position, speed, or segment progress data is available.
- No individual historical trajectories exist — recovery measurement is impossible now.

## 13. ML Readiness

**NOT READY for supervised ML training.**

Blockers:
- `actual_arrival_time`: MISSING (no ground truth labels)
- `historical_trajectory`: MISSING (no individual time series)

## 14. Future Data Requirements

1. Sustained collection of timestamped delay snapshots (minimum 2× per journey per train)
2. Current station tracking at each observation
3. Actual arrival timestamps recorded post-arrival
4. Minimum 90-day collection period for seasonal variation coverage
