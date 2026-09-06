# RailRadar Live Train Status API Integration

This document explains how the project integrates with the [RailRadar Live Train Status API](https://railradar.in/docs/live-train-status) to fetch real-time train running status, telemetry location, and delay.

## 1. How to Obtain an API Key

According to the official documentation, you need to acquire an API key to authenticate your requests:
1. Register or log in at `https://railradar.in/signup`.
2. Navigate to the **Developers Dashboard** (`https://railradar.in/developers`).
3. Generate a production API key. The key will start with the prefix `rr_live_`.

## 2. Environment Configuration

To configure the API key for the project:
1. Copy the `.env.example` file to `.env` in the root of the project:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and replace `your_api_key_here` with your actual RailRadar API key:
   ```env
   RAILRADAR_API_KEY=rr_live_...
   ```
**Important:** Never commit your `.env` file to version control. The client automatically reads the API key from this environment variable.

## 3. Running the Client

The integration module is located at `src/live_api/railradar_client.py`.
You can test the integration by running the provided test script:

```bash
# Ensure your virtual environment is active and dependencies are installed
pip install python-dotenv requests
python src/live_api/test_client.py
```

### Example Usage in Python:
```python
from src.live_api.railradar_client import RailRadarClient

client = RailRadarClient()
status = client.get_live_status("12919")

if status:
    print(status["delay_minutes"])
```

## 4. Returned Fields

The client standardises the API response into the following dictionary format (only keeping fields that are actually available from the API):

| Field | Type | Description |
|---|---|---|
| `train_number` | String | The 5-digit train number (e.g. "12919") |
| `current_status` | String | Train status (e.g., "running", "scheduled", "completed") |
| `delay_minutes` | Integer | Current delay in minutes |
| `speed_kmh` | Float | Current speed in km/h |
| `previous_station` | String | Station code of the last halt |
| `next_station` | String | Station code of the next halt |
| `current_position_station` | String | Station code of current location (if at a station) |
| `segment_progress` | Float | Progress on current segment (0.0 to 1.0) |
| `update_time` | String | ISO 8601 timestamp of last telemetry update |

## 5. API Limitations & Errors

The client handles the following documented API limitations and errors:
* **Rate Limits (429):** Free Sandbox tier allows 1,000 requests/month. The client respects this and will log an error without crashing if the limit is exceeded.
* **Authentication (401):** API requests require a valid key in the Authorization header.
* **Service Availability (503):** If upstream telemetry degrades, the API returns a 503 Service Unavailable, which is logged.
* **Caching:** The client implements an in-memory cache (default TTL 60 seconds) to avoid redundant requests for the same train and date.
* **Not Found (404):** Logged if a train or journey record doesn't exist.
