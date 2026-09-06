# Data Feasibility Analysis for Train ETA Prediction

## 1. Analysis of `delays.json`

Based on the actual schema of `data/raw/railpull/data/out/delays.json`:

1. **What exact fields exist in delays.json?**
   The root contains `updatedAt`, `source`, and `trains`. The `trains` object is a dictionary mapping train numbers to a single field: `{"d": delay_in_minutes}`.
2. **Does each delay record contain a timestamp?**
   No. There is only one global `updatedAt` timestamp for the entire file. Individual train records do not have their own timestamps.
3. **Does it contain train number?**
   Yes, it is used as the key in the `trains` dictionary.
4. **Does it contain current station?**
   No.
5. **Does it contain next station?**
   No.
6. **Does it contain position or distance?**
   No.
7. **Does it contain actual arrival information?**
   No.
8. **Can repeated delay snapshots be connected to a particular train journey?**
   Yes, by `train_number`. However, without location data, we cannot track the train's actual progress along its route.
9. **Can the live delay data be joined with the schedule dataset?**
   Only at the train level. Because the delay data lacks location (station) context, we cannot join it to a specific segment or stop in the `schedules.json` dataset.
10. **What would be the primary key for joining datasets?**
    `train_number` is the only available key, but it is insufficient for segment-level tracking. A true primary key for a training record would need to be `(train_number, date, current_station)`.

## 2. Feature Availability

| FEATURE | SOURCE | STATUS | HOW IT WILL BE OBTAINED |
|---|---|---|---|
| `train_number` | `delays.json` / Schedules | AVAILABLE | Extracted from the `trains` dictionary keys or schedule data. |
| `date` | `delays.json` | DERIVABLE | Extracted from the global `updatedAt` timestamp. |
| `observation_time` | `delays.json` | AVAILABLE | Using the global `updatedAt` timestamp. |
| `current_station` | N/A | MISSING | Not present in `delays.json`. The RailRadar API has this, but we lack historical data. |
| `next_station` | N/A | MISSING | Not present in `delays.json`. |
| `target_station` | N/A | MISSING | Cannot be determined without knowing the current location. |
| `current_delay` | `delays.json` | AVAILABLE | Extracted from the `"d"` field. |
| `scheduled_arrival` | Schedules | MISSING | Cannot be looked up without knowing the train's current/next location. |
| `scheduled_remaining_time`| N/A | MISSING | Cannot be calculated without location context. |
| `distance_remaining` | N/A | MISSING | Cannot be calculated without location context. |
| `actual_arrival_time` | N/A | MISSING | We do not have historical logs of when trains actually arrived at stations. |

## 3. Conclusion

**C. NO — another historical source is required.**

### Explanation
To train a supervised machine learning model for ETA prediction, we absolutely require two things:
1. **Contextual Features:** The model needs to know *where* the train is (current station) and *when* the observation was made. `delays.json` completely lacks location data, making it impossible to map a delay to a specific segment of the journey.
2. **Ground Truth (Target Variable):** We need the `actual_arrival_time` for historical journeys to calculate the true remaining time and train the model. None of our current datasets (Datameet or Railpull) provide historical actual arrival logs. They only provide static planned timetables.

While our newly built RailRadar API integration *does* provide location (`current_position_station`) and delay, we only just built it. To use it for a training dataset, we would need to continuously poll and record data for months to capture enough completed journeys to derive `actual_arrival_time`. Since we need to build a model now, the currently available static data and single snapshot are completely insufficient. We must acquire an external historical dataset containing past train movements and actual arrival times.
