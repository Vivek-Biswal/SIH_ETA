# Datameet Indian Railways Data Inventory

## Overview
This document contains an inventory of the data files available in the Datameet Indian Railways repository (`https://github.com/datameet/railways`). The repository has been cloned to `data/raw/railways`.

## Available Data Files

### 1. stations.json
*   **File Format:** GeoJSON FeatureCollection
*   **Number of Records:** 8,990
*   **Data Structure:** Each record represents a station as a geographical point feature.
    *   **Coordinates:** Longitude and Latitude.
    *   **Properties:** `state`, `code`, `name`, `zone`, `address`
*   **Sample Record Properties:**
    ```json
    {
      "state": "Rajasthan",
      "code": "BDHL",
      "name": "Badhal",
      "zone": "NWR",
      "address": "Kishangarh Renwal, Rajasthan"
    }
    ```
*   **Missing Values:**
    *   `state`: 4,593 missing
    *   `zone`: 4,532 missing
    *   `address`: 4,593 missing
    *   `name`: 1 missing

### 2. trains.json
*   **File Format:** GeoJSON FeatureCollection (multiline string geometries for train routes)
*   **Number of Records:** 5,208
*   **Data Structure:** Each record represents a train and its summary information.
    *   **Properties:** `third_ac`, `arrival`, `from_station_code`, `name`, `zone`, `chair_car`, `first_class`, `duration_m`, `sleeper`, `from_station_name`, `number`, `departure`, `return_train`, `to_station_code`, `second_ac`, `classes`, `to_station_name`, `duration_h`, `type`, `first_ac`, `distance`
*   **Missing Values:**
    *   `classes`: Completely missing (5,208 missing)
    *   `return_train`: 599 missing
    *   `zone`, `duration_m`, `duration_h`, `type`, `distance`: 15 missing each
    *   `name`: 1 missing

### 3. schedules.json
*   **File Format:** JSON List
*   **Number of Records:** 417,080
*   **Data Structure:** Each record represents a scheduled stop for a train at a specific station.
    *   **Keys:** `arrival`, `day`, `train_name`, `station_name`, `station_code`, `id`, `train_number`, `departure`
*   **Sample Record:**
    ```json
    {
      "arrival": "None", 
      "day": 1, 
      "train_name": "Falaknuma Lingampalli MMTS", 
      "station_name": "KACHEGUDA FALAKNUMA", 
      "station_code": "FM", 
      "id": 302214, 
      "train_number": "47154", 
      "departure": "07:55:00"
    }
    ```
*   **Missing Values:**
    *   `day`: 22,561 missing (Note: arrival times might also be string "None", which needs cleaning)
    *   `train_name`: 8 missing
    *   `station_name`: 2 missing

---

## Usefulness for Train ETA Prediction Project

**Useful Data:**
*   **`schedules.json`**: This is the core dataset for baseline scheduling. It provides the scheduled (theoretical) arrival and departure times for each station on a train's route.
*   **`stations.json`**: Highly useful for mapping and spatial engineering features, as it includes the geographic coordinates of the stations.
*   **`trains.json`**: Useful for basic train metadata, such as route distance, duration, train type, and originating/terminating stations.

**Important Data Missing for ETA Prediction:**
1.  **Actual/Historical Live Running Data:** This dataset only contains the static, scheduled timetables. To predict an ETA (Estimated Time of Arrival) based on real-world conditions, we critically need historical data showing the *actual* arrival and departure times (delays, early arrivals) compared to the scheduled times. 
2.  **Date/Time Stamps:** The `schedules.json` only tracks the `day` of the journey (Day 1, Day 2) and times, but does not provide actual historical dates. ETA prediction typically requires time-series data to account for seasonal, daily, or weather-related delays.
3.  **Weather and Infrastructure Data:** External factors such as weather along the route, track maintenance schedules, or congestion are not present but are highly influential for ETA models.
