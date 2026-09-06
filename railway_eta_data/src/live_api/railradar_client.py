import os
import time
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class RailRadarClient:
    """Client for the RailRadar Live Train Status API."""
    
    BASE_URL = "https://api.railradar.in/v1"
    
    def __init__(self, api_key: Optional[str] = None, cache_ttl: int = 60):
        """
        Initialise the client.
        
        Args:
            api_key: The RailRadar API key. If None, it attempts to read from RAILRADAR_API_KEY.
            cache_ttl: Time-to-live for cached responses in seconds.
        """
        self.api_key = api_key or os.environ.get("RAILRADAR_API_KEY")
        if not self.api_key:
            logger.warning("RAILRADAR_API_KEY is not set. API calls will fail if not provided.")
            
        self._cache = {}
        self.cache_ttl = cache_ttl

    def get_live_status(self, train_number: str, date: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Fetch the live status of a train.
        
        Args:
            train_number: 5-digit train number (e.g. '12919').
            date: Optional journey start date in YYYY-MM-DD.
            
        Returns:
            A standardised internal representation of the train's live status, or None if failed.
        """
        if not self.api_key:
            logger.error("Cannot fetch live status: RAILRADAR_API_KEY is missing.")
            return None

        # Check cache
        cache_key = f"{train_number}_{date}"
        if cache_key in self._cache:
            entry, timestamp = self._cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                logger.debug(f"Returning cached response for train {train_number}")
                return entry

        url = f"{self.BASE_URL}/trains/{train_number}/live"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        params = {}
        if date:
            params["date"] = date

        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    parsed = self._parse_live_response(data["data"])
                    # Update cache
                    self._cache[cache_key] = (parsed, time.time())
                    return parsed
                else:
                    logger.error(f"Invalid response format from API: {data}")
                    return None
                    
            elif response.status_code == 400:
                logger.error(f"Bad Request for train {train_number}: {response.text}")
            elif response.status_code == 401:
                logger.error("Unauthorized: Invalid or missing API key.")
            elif response.status_code == 404:
                logger.warning(f"Train {train_number} not found.")
            elif response.status_code == 429:
                logger.error("Rate Limited: Quota exceeded.")
            elif response.status_code == 503:
                logger.error("Service Unavailable: Upstream telemetry degraded.")
            else:
                logger.error(f"HTTP Error {response.status_code}: {response.text}")
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout while fetching status for train {train_number}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for train {train_number}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error parsing response for train {train_number}: {e}")
            
        return None

    def _parse_live_response(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert the raw API response into a standardized internal format.
        """
        loc = raw_data.get("currentLocation", {})
        
        return {
            "train_number": raw_data.get("trainNumber"),
            "current_status": raw_data.get("status"),
            "delay_minutes": raw_data.get("delayMinutes"),
            "speed_kmh": loc.get("speedKmh"),
            "previous_station": raw_data.get("previousHalt", {}).get("stationCode"),
            "next_station": raw_data.get("nextHalt", {}).get("stationCode"),
            "current_position_station": loc.get("stationCode"),
            "segment_progress": loc.get("segmentProgress"),
            "update_time": raw_data.get("lastUpdatedAt")
        }
