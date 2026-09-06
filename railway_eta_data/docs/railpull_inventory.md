# Railpull Data Inventory

## Overview
This document contains an inventory of the data collection toolkit **Railpull** (`https://github.com/shwetankg07/railpull`), cloned to `data/raw/railpull`.

## What Railpull Provides
Railpull is a toolkit for polling and extracting data from India's National Train Enquiry System (NTES). It consists of:
1.  **Crawler (`ntes/crawl.py`)**: Systematically discovers trains and fetches their complete, up-to-date schedule.
2.  **Exporter (`transform/export.py`)**: Flattens the raw JSON schedules into tidy, analysis-ready CSV files.
3.  **Delay Poller (`ntes/poll_delays.py`)**: Fetches a live snapshot of train delays and cancellations at major stations.
4.  **OSM Tooling (`osm/`)**: Optionally maps stations to precise coordinates and draws track geometry using OpenStreetMap data.

**Authentication & Source:**
*   **Source:** NTES (National Train Enquiry System)
*   **Authentication:** None required. It uses an unofficial reverse-engineered Python client (`ntes-client`). No API keys or paid services are necessary.

---

## Data Formats & Schemas

When the data generation pipeline is run, it produces the following files in `data/out/`:

### 1. `trains.csv`
*   **Format:** CSV
*   **Description:** One row per train.
*   **Key Columns:** `number`, `name`, `type`, `runs_days` (the specific days of the week it operates), `source`, `destination`, `distance`, `stops`

### 2. `stops.csv`
*   **Format:** CSV
*   **Description:** One row per stop along a train's route.
*   **Key Columns:** `train`, `seq`, `station code`, `station name`, `day offset`, `arrival`, `departure`, `halt`

### 3. `stations.csv`
*   **Format:** CSV
*   **Description:** One row per station.
*   **Key Columns:** `code`, `name`, `lat`, `lon` (coordinates generated via the OSM step)

### 4. `schedules.jsonl`
*   **Format:** JSONL (JSON Lines)
*   **Description:** The full, nested, raw JSON schedule record for each train.

### 5. `delays.json`
*   **Format:** JSON
*   **Description:** Live snapshot of current delays.
*   **Schema Example:**
    ```json
    {
      "updatedAt": 1783683912,
      "source": "ntes-station-boards",
      "trains": {
        "12951": {"d": 18},
        "12009": {"c": 1}
      }
    }
    ```
    *(Where `"d"` is minutes delayed, and `"c": 1` denotes a cancellation)*

---

## Limitations and Constraints
*   **Rate Limits:** The crawler operates deliberately slowly (~1 request per 1.2s) to avoid being blocked by NTES. Scraping the full timetable takes a few hours.
*   **Data Reliability:** NTES delay data can occasionally be "stale garbage" (e.g., trains reported as 57 hours late). The poller has to cap believable delays at 12 hours.
*   **Unofficial Client:** As it relies on an undocumented backend via `ntes-client`, any structural changes by NTES could break the tool.
*   **Terms of Service:** While the schedule data is factual and public, large-scale redistribution might conflict with IRCTC/NTES terms of use.

---

## Comparison with Datameet Data

| Feature | Datameet (`railways`) | Railpull |
| :--- | :--- | :--- |
| **Data Vintage** | Stale (~2016 community snapshot) | **Current** (Pulled live from NTES) |
| **Live Delays** | ❌ No | ✅ **Yes** (`poll_delays.py`) |
| **Operating Days** | ❌ Missing/Implicit | ✅ **Yes** (`runs_days` in `trains.csv`) |
| **Track Geometry** | Straight-line coordinates | **Actual rail graphs** (via OSM integration) |
| **Train Types** | Older categories | Current NTES codes (e.g., Vande Bharat `VNDB`) |

### Usefulness for Train ETA Prediction Project
Railpull is **significantly more useful** for our ETA project than the Datameet snapshot because:
1.  **Live Delay Feed**: The `delays.json` generator provides the real-time target variable (delay in minutes) that our model needs to predict.
2.  **`runs_days`**: Knowing exactly which weekdays a train operates helps filter out invalid predictions for daily runs.
3.  **Current Roster**: It includes modern trains (Vande Bharat) and up-to-date schedules that reflect current reality, unlike the 2016 Datameet snapshot. 

**Conclusion:** We should utilize Railpull (or adapt its delay-polling logic) to build our live data collection pipeline for the ETA prediction model, while remaining polite to the NTES servers.
