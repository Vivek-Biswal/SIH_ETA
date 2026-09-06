# Data Cleaning Rules

This document explains every cleaning rule applied in the `src/cleaning/` pipeline.
**Raw files are never modified.** Cleaned outputs are written to `data/processed/`.

---

## Decision Types

Every flagged record receives exactly one decision:

| Decision | Meaning |
|----------|---------|
| **KEEP** | Record is valid; no action needed |
| **MAP** | Value is standardised to a canonical form; original is preserved in the log |
| **EXCLUDE** | Record is clearly unusable (exact duplicate or proven invalid); removed from processed output |
| **INVESTIGATE** | Record is suspicious but cannot be safely classified automatically; kept in processed output; requires human review before use in modelling |

---

## Dataset-Specific Rules

### 1. `schedules.json` (417,080 records → 416,636 kept)

| Rule ID | Field | Condition | Decision | Reason |
|---------|-------|-----------|----------|--------|
| SCH-01 | `arrival` / `departure` | Value is `"None"`, `""`, or `null` | **KEEP** | Intentional sentinel: first stops have no arrival; terminal stops have no departure. This is not missing data. |
| SCH-02 | `arrival` / `departure` | String does not match `HH:MM[:SS]` | **INVESTIGATE** | Unparseable time string; cannot be safely corrected. |
| SCH-03 | `arrival` / `departure` | Hour is `24` (e.g. `24:00:00`) | **MAP** | Mapped to `00:00:00`; midnight representation normalised. Original preserved in log. |
| SCH-04 | `arrival` / `departure` | Hour > 24 | **INVESTIGATE** | Implausibly large hour value; may be a data error. |
| SCH-05 | `day` | Value is `null` | **INVESTIGATE** | Journey-day offset unknown. Without `day`, midnight-crossing logic cannot be applied correctly. |
| SCH-06 | `station_code`, `train_number`, `id` | Value is null or empty | **INVESTIGATE** | Required identifier is missing; record cannot be linked to other datasets. |
| SCH-07 | `station_code` | Code not found in `stations_clean.json` | **INVESTIGATE** | Station code exists in schedules but has no reference entry. May be a renamed or new station. |
| SCH-08 | `(train_number, station_code, departure)` | Exact tuple appears more than once | **EXCLUDE** | Exact duplicate stop record; second occurrence removed. |

---

### 2. `stations.json` (8,990 records)

| Rule ID | Field | Condition | Decision | Reason |
|---------|-------|-----------|----------|--------|
| STA-01 | `code` | Starts with `XX-` or `YY-` | **INVESTIGATE** | Datameet placeholder code; real station identity unknown. Cannot safely map to any real station. |
| STA-02 | `state`, `zone`, `address` | Value is `null` | **INVESTIGATE** | Informational gap; does not make the record unusable but limits enrichment. OSM step may fill these. |
| STA-03 | `geometry` | `null` | **INVESTIGATE** | No geographic coordinates; spatial features cannot be computed for this station. Kept because station code and name are still usable. |
| STA-04 | `code` | Duplicate code across two features | **INVESTIGATE** | Two entries share the same station code; only the first occurrence was used to build the reference set. Human review required to determine the canonical entry. |

---

### 3. `trains.json` (5,208 records)

| Rule ID | Field | Condition | Decision | Reason |
|---------|-------|-----------|----------|--------|
| TRN-01 | `type` | Matches a known Datameet code (e.g. `SF`, `Exp`, `Raj`) | **MAP** | Mapped to canonical label (e.g. `SF` -> `Superfast`). Full mapping table in `validators.py::TRAIN_TYPE_MAP`. |
| TRN-02 | `type` | Empty string or unrecognised code | **INVESTIGATE** | Cannot classify the train type. |
| TRN-03 | `distance` | `== 0` | **INVESTIGATE** | Zero distance is suspicious; may indicate a missing value encoded as zero. |
| TRN-04 | `distance` | `> 5000 km` | **INVESTIGATE** | Exceeds the longest plausible Indian train route (~4,286 km). May be a data error. |
| TRN-05 | `distance` | `< 0` | **EXCLUDE** | Negative distance is physically invalid. |
| TRN-06 | `classes` | Always empty string (all 5,208 records) | **EXCLUDE** | Column carries no information; removed from processed output. Decision logged once as `trains#ALL`. |
| TRN-07 | `number`, `name` | Null or empty | **INVESTIGATE** | Required train identifier is missing. |
| TRN-08 | `zone`, `duration_h`, `duration_m` | Null | **INVESTIGATE** | Important scheduling fields; absence limits ETA feature engineering. |
| TRN-09 | `from_station_code`, `to_station_code` | Not in stations reference | **INVESTIGATE** | Endpoint station code cannot be cross-validated. |
| TRN-10 | `arrival`, `departure` | Same time-format rules as SCH-02/03/04 | **MAP / INVESTIGATE** | Same logic as schedules (see above). |
| TRN-11 | `number` | Duplicate train number across two features | **EXCLUDE** | First occurrence kept; subsequent records excluded. |

---

### 4. `delays.json` (Railpull, 444 records)

| Rule ID | Field | Condition | Decision | Reason |
|---------|-------|-----------|----------|--------|
| DEL-01 | `train_number` | Not found in `trains_clean.json` | **INVESTIGATE** | May be a new or unlisted service not in the Datameet snapshot. Kept in output. |
| DEL-02 | `d` (delay minutes) | `> 720` (12 hours) | **INVESTIGATE** | Exceeds Railpull's own plausibility cap. Likely stale board data. |
| DEL-03 | `d` (delay minutes) | `< 0` | **INVESTIGATE** | Negative delay is physically implausible (train cannot arrive before it departs). |
| DEL-04 | `d` (delay minutes) | Non-integer value | **INVESTIGATE** | Unexpected data type; cannot be used as a numeric target variable. |

---

## Midnight Crossing Handling

Multi-day trains have stop records where `day` > 1. When computing elapsed travel time:

1. The `day` field in `schedules.json` is the **journey-day offset** (1 = Day 1, 2 = Day 2, etc.).
2. A departure time of `23:55` on Day 1 followed by an arrival of `00:10` on Day 2 is a valid midnight crossing; no time anomaly.
3. Records with `day == null` **cannot** have midnight crossings resolved automatically (see SCH-05).

---

## What Is Not Done (Intentionally)

- **No merging of datasets** — datasets remain separate in `data/processed/`.
- **No imputation** — missing values are flagged, not filled.
- **No normalisation of text fields** (e.g. station names) — planned for a later enrichment phase.
- **No data from external sources added** — all decisions are based on the data that actually exists.
