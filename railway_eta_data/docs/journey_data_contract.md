# Journey Data Contract

This document defines the strict boundaries and definitions of train "journeys" within the SIH Indian Train ETA Prediction Project. It clarifies what is currently possible to reconstruct given our available datasets and sets limitations to prevent the hallucination of historical tracking data.

## 1. Definitions

- **Journey**: The sequential traversal of a train from its origin station to its destination station, passing through a specific set of intermediate stops.
- **Scheduled Journey**: A theoretical blueprint of a journey derived strictly from static railway timetables. It defines the intended route, the intended sequence of stations, and the intended arrival/departure times.
- **Actual Historical Journey**: A real-world, completed transit of a train, verified by recorded timestamp logs of when the train *actually* arrived and departed from each station on a specific past date.

## 2. Current Data Availability

### What is Available
- **Static Schedules**: We have access to `schedules_clean.json` and `trains_clean.json`, providing scheduled stops, days, and planned times.
- **Live Snapshot**: We have `delays_clean.json`, providing a single snapshot of current delays, but without historical logs.
- **Aggregated History**: We have `public_historical_delay_clean.csv`, providing summary statistics of delays, but not individual train logs.

### What is Missing
- **Historical Actual Arrival Timestamps**: We lack verified logs of individual train movements with actual arrival times at each station for past dates.
- **Explicit Sequence Numbers**: The `schedules_clean.json` dataset does not natively contain `sequence` or `distance` columns for individual stops. 

## 3. Journey Reconstruction Capabilities

**CURRENTLY POSSIBLE: Scheduled Journey Reconstruction**
We can reconstruct the *intended* routes and station sequences for trains by joining the `trains_clean.json` and `schedules_clean.json` datasets and logically sorting the scheduled stops.

**NOT CURRENTLY POSSIBLE: Reconstructing Verified Historical Individual Train Movements**
We cannot reconstruct actual historical journeys because we lack the ground-truth observation logs. 

**NOT CURRENTLY POSSIBLE: Obtaining Historical Actual Arrival Timestamps**
No current dataset provides actual arrival timestamps for individual trains. 

## 4. Participating Datasets & Joining Keys

The following datasets participate in the Scheduled Journey Reconstruction:

- **`trains_clean.json`**: Provides the top-level train metadata (number, type, origin, destination).
- **`schedules_clean.json`**: Provides the unordered set of scheduled stops for each train.
- **`stations_clean.json`** (Optional): Provides station metadata (coordinates, names).

**Joining Keys:**
- `schedules_clean.json` joins to `trains_clean.json` via `train_number`.
- `schedules_clean.json` joins to `stations_clean.json` via `station_code`.

## 5. Reconstruction Limitations

1. **Inferred Ordering**: Because explicit sequence numbers and distances are absent in the schedule data, the station order must be inferred by sorting stops primarily by the `day` field, followed by the `arrival` time (falling back to `departure` time for the origin station).
2. **Missing Distances**: Inter-station distances are not available at the schedule level and will be omitted from individual stop records. Total route distance remains available at the train level.
3. **No Dynamic Data**: These reconstructed journeys are purely static baselines and contain no live or historical actual delay tracking.
