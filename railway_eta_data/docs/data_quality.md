# Data Quality Report

> Generated from the output of the cleaning pipeline on 2026-09-07.
> Raw files have not been modified. All processed files are in `data/processed/`.

---

## 1. Dataset Overview

| # | Dataset | Category | Records (raw) | Records (clean) | Format |
|---|---------|----------|---------------:|----------------:|--------|
| 1 | `stations_clean` | **Static** | 8,990 | 8,990 | JSON, CSV |
| 2 | `trains_clean` | **Static** | 5,208 | 5,208 | JSON, CSV |
| 3 | `schedules_clean` | **Static** | 417,080 | 416,636 | JSON, CSV |
| 4 | `delays_clean` | **Live Snapshot** | 444 | 444 | JSON, CSV |
| | **Total** | | **431,722** | **431,278** | |

**444 records were excluded** (exact duplicate schedule stops).

---

## 2. Data Category Classification

### Static Data (Timetable)
- `stations_clean` -- Station master list with codes, names, zones, and coordinates.
- `trains_clean` -- Train metadata: number, type, origin/destination, distance, duration, coach classes.
- `schedules_clean` -- Scheduled stop times for every train at every station on its route.

> **These are scheduled/planned values, NOT historical actuals.**
> The timetable tells us when a train *should* arrive, not when it *did* arrive.

### Live Snapshot Data
- `delays_clean` -- A single point-in-time snapshot of delays and cancellations across 444 trains at 150 major junctions.

### Historical Data
> **No historical actual arrival/departure data is available in any of our current datasets.**
> The Datameet repository contains only a static timetable snapshot (~2016).
> Railpull's delay poller captures live snapshots, but we have only one snapshot so far.
> Building a historical dataset would require running the delay poller repeatedly over weeks/months.

---

## 3. Decision Engine Summary

| Decision | Count | Meaning |
|----------|------:|---------|
| **MAP** | 5,193 | Value standardised to canonical form (all are train type mappings) |
| **EXCLUDE** | 445 | Unusable records removed (444 exact duplicate stops + 1 empty column) |
| **INVESTIGATE** | 36,861 | Flagged for human review; kept in processed output |
| **KEEP** | -- | Valid records produce no log entry; ~394,400 records are clean |

### Decisions by Source

| Source | EXCLUDE | INVESTIGATE | MAP |
|--------|--------:|------------:|----:|
| stations | 0 | 14,034 | 0 |
| trains | 1 | 118 | 5,193 |
| schedules | 444 | 22,480 | 0 |
| delays | 0 | 229 | 0 |

---

## 4. Missing Value Statistics

### stations_clean (8,990 records)

| Field | Missing | % |
|-------|--------:|----:|
| state | 4,593 | 51.09% |
| address | 4,593 | 51.09% |
| zone | 4,532 | 50.41% |
| lon | 293 | 3.26% |
| lat | 293 | 3.26% |
| name | 1 | 0.01% |
| code | 0 | 0% |

### trains_clean (5,208 records)

| Field | Missing | % |
|-------|--------:|----:|
| return_train | 599 | 11.50% |
| type / zone / distance / duration | 15 each | 0.29% |
| name | 1 | 0.02% |
| number | 0 | 0% |

### schedules_clean (416,636 records)

| Field | Missing | % | Note |
|-------|--------:|----:|------|
| arrival | 27,647 | 6.64% | Expected: first stops have no arrival |
| departure | 27,637 | 6.63% | Expected: last stops have no departure |
| day | 22,419 | 5.38% | Journey-day offset unknown |
| train_name | 8 | <0.01% | |
| station_name | 2 | <0.01% | |

### delays_clean (444 records)

| Field | Missing | % | Note |
|-------|--------:|----:|------|
| delay_min | 19 | 4.28% | These are cancelled trains (no delay value) |

---

## 5. Duplicate Statistics

| Dataset | Exact Duplicates Found | Removed |
|---------|----------------------:|---------:|
| schedules | 444 | 444 |
| stations | 0 duplicate codes | 0 |
| trains | 0 duplicate numbers | 0 |
| delays | N/A (keyed by train number) | 0 |

---

## 6. Station Mapping Statistics

| Metric | Count |
|--------|------:|
| Total station codes in reference | 8,990 |
| Valid codes (excluding placeholders) | 8,967 |
| Placeholder codes (`XX-`/`YY-`) | 23 |
| Stations with no coordinates | 293 |
| Schedule stop codes not in reference | 61 |
| Delay train numbers not in trains reference | 229 |

---

## 7. Issue Type Breakdown

| Issue Type | Count | Decision |
|------------|------:|----------|
| MISSING_VALUE | 36,198 | INVESTIGATE |
| TYPE_STANDARDISED | 5,193 | MAP |
| EXACT_DUPLICATE | 444 | EXCLUDE |
| MISSING_GEOMETRY | 293 | INVESTIGATE |
| UNKNOWN_TRAIN_NUMBER | 229 | INVESTIGATE |
| UNKNOWN_STATION_CODE | 61 | INVESTIGATE |
| DISTANCE_ISSUE | 42 | INVESTIGATE |
| PLACEHOLDER_CODE | 23 | INVESTIGATE |
| UNKNOWN_TYPE | 15 | INVESTIGATE |
| EMPTY_COLUMN | 1 | EXCLUDE |

---

## 8. Data Limitations

1. **No historical running data.** All schedule data is static timetable. We do not have records of actual past arrivals or departures. This is the most critical gap for training an ETA prediction model.

2. **Stale timetable.** The Datameet snapshot is from approximately 2016. Many trains have been added, rescheduled, or renamed since. Newer trains (Vande Bharat, etc.) are absent.

3. **Single delay snapshot.** We have one live snapshot from Railpull covering 444 trains. A useful training dataset would require thousands of snapshots collected over weeks/months.

4. **Incomplete station metadata.** Over 51% of stations lack state, zone, and address information. 3.26% lack coordinates entirely.

5. **Missing journey-day offsets.** 5.38% of schedule stops have `day = null`, making it impossible to correctly compute elapsed journey time or handle midnight crossings for those records.

6. **No weather or infrastructure data.** External factors influencing delays (weather, track maintenance, congestion) are not captured in any current dataset.

7. **Cross-reference gaps.** 229 trains in the live delay snapshot are not found in the Datameet train roster (newer services). 61 station codes in schedules have no matching station reference entry.
