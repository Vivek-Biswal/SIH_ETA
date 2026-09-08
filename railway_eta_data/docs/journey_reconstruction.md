# Scheduled Journey Reconstruction

This document outlines the methodology and results of the Scheduled Journey Reconstruction process (Group A - Chunk 1).

## 1. Purpose

The purpose of this reconstruction is to take the isolated, unordered scheduled stops provided by the `schedules_clean.json` dataset and rebuild them into a structured, sequential journey representation for each train.

> [!WARNING]
> **CRITICAL LIMITATION**: This process creates **Scheduled Journeys** only. It reconstructs the intended route and timetable based on static data. It does **not** represent verified historical train movements, because the dataset lacks actual historical arrival logs.

## 2. Input Datasets

- **`schedules_clean.json`**: Contains 416,636 individual scheduled stop records.
- **`trains_clean.json`**: Provides the top-level metadata for 5,208 scheduled trains.

## 3. Reconstruction Methodology

The `schedules_clean.json` dataset provides scheduled stops but fundamentally lacks explicit `sequence` indicators or `distance` markers to define station order. 

To determine the exact route order, we implemented the following methodology:
1. **Grouping**: All records are grouped by `train_number`.
2. **Sorting Strategy**: For each train, the stops are sorted primarily by the `day` field.
3. **Time Inference**: For the secondary sort key, we convert the `arrival` time to seconds from midnight. If the `arrival` time is `None` (which occurs at the origin station), we fall back to the `departure` time.
4. **Sequence Assignment**: After sorting, a monotonically increasing `sequence` number (1-indexed) is assigned to each stop.

## 4. Final Journey Schema

The reconstructed output is saved as `data/processed/journeys_scheduled.json` in the following standard representation:

```json
[
  {
    "train_number": "12345",
    "journey_route": [
      {
        "station": "ABC",
        "sequence": 1,
        "scheduled_arrival": null,
        "scheduled_departure": "08:00:00",
        "day": 1.0
      },
      {
        "station": "XYZ",
        "sequence": 2,
        "scheduled_arrival": "09:30:00",
        "scheduled_departure": "09:35:00",
        "day": 1.0
      }
    ]
  }
]
```
*(Note: The `distance` field is omitted from individual stops as it is not present in the schedules dataset).*

## 5. Summary & Results

- **Reconstructed Journeys**: 5,208
- **Total Stops Processed**: 416,636

### Data Quality Issues

During the validation of the reconstructed journeys, we run tests to ensure no stations are missing, there are no consecutive duplicate stations, and time flows logically. 

The primary issue identified:
- **Missing Intermediate Times**: ~44,951 intermediate stops are missing either an arrival or departure time (often recorded as `None`). This typically indicates a "pass-through" station where the train does not halt, or an incomplete historical schedule record. These have been flagged but kept in the sequence to preserve the route topology.

Detailed validation output is available in `reports/journey_reconstruction_quality.csv`.
