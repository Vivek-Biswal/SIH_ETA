"""Selected-station forecasts. Weather is evidence, not a measured train delay."""
from collections import OrderedDict
from datetime import datetime, timezone
from threading import Lock
from time import monotonic
import math
import json
from pathlib import Path
from functools import lru_cache
import httpx
from config.settings import settings
from services import railradar_passenger as rail

_cache = OrderedDict()
_lock = Lock()

@lru_cache(maxsize=1)
def geography():
    try:
        return json.loads((Path(__file__).resolve().parents[1] / 'data/station-geography.json').read_text())
    except (OSError, ValueError):
        return {}

def forecast(latitude, longitude):
    key = (round(latitude, 3), round(longitude, 3))
    # One request per location every 15 minutes; also coalesce concurrent callers.
    with _lock:
        hit = _cache.get(key)
        if hit and monotonic() < hit[0]:
            return hit[1]
        try:
            response = httpx.get('https://api.openweathermap.org/data/2.5/forecast',
                params={'lat': key[0], 'lon': key[1], 'appid': settings.WEATHER_API_KEY, 'units': 'metric'}, timeout=6)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload.get('list'), list) or not payload['list']:
                raise ValueError('Missing forecast')
            result = {'rows': payload['list'], 'retrieved_at': datetime.now(timezone.utc).isoformat()}
            ttl = 900
        except (httpx.HTTPError, ValueError, TypeError):
            result = None
            ttl = 60
        _cache[key] = (monotonic() + ttl, result)
        _cache.move_to_end(key)
        while len(_cache) > 256:
            _cache.popitem(last=False)
        return result

def weather_for_journey(data, code, now=None):
    now = now or datetime.now(timezone.utc)
    base = {'train_number': str(data['trainNumber']), 'date': data['startDate'], 'station_code': code,
            'available': False, 'provider': 'OpenWeather', 'weather_delay_minutes': None}
    def unavailable(message):
        return {**base, 'message': message}
    matches = [r for r in data['route'] if r.get('stationCode') == code]
    if len(matches) != 1:
        return unavailable('Weather cannot be matched to a unique stop on this journey.')
    row = matches[0]
    eta = rail.eta_response(data, now)
    prediction = next(p for p in eta['remaining_stations'] if (p.get('station') or {}).get('code') == code)
    arrival = rail.timestamp(prediction['predicted_arrival'] or prediction['scheduled_arrival'])
    if not arrival or arrival < now or (arrival-now).total_seconds() > 5*86400:
        return unavailable('Weather forecast is available only for upcoming arrivals within five days.')
    if not settings.WEATHER_API_KEY:
        return unavailable('OpenWeather is not configured on the ETA server.')
    try:
        coordinates = [row.get('latitude'), row.get('longitude')]
        coordinate_source = 'railway provider'
        if None in coordinates:
            coordinates = geography().get(code, [None, None])
            coordinate_source = 'historical station directory'
        lat, lon = map(float, coordinates)
        if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError()
    except (KeyError, TypeError, ValueError):
        return unavailable('Verified coordinates for this station are unavailable. No weather location is guessed.')
    data = forecast(lat, lon)
    if not data:
        return unavailable('OpenWeather forecast is temporarily unavailable. The train ETA is unchanged.')
    try:
        rows = [r for r in data['rows'] if isinstance(r.get('dt'), (int, float)) and math.isfinite(r['dt'])]
        item = min(rows, key=lambda r: abs(r['dt'] - arrival.timestamp()))
        if abs(item['dt'] - arrival.timestamp()) > 10800:
            return unavailable('No forecast interval covers this arrival time.')
        condition = item['weather'][0]['description']
        temperature = float(item['main']['temp'])
        wind = float(item['wind']['speed'])
        rain = float(item.get('rain', {}).get('3h', 0))
        if not all(math.isfinite(v) for v in (temperature, wind, rain)) or wind < 0 or rain < 0:
            raise ValueError()
        return {**base, 'available': True, 'condition': condition, 'coordinate_source': coordinate_source,
                'temperature_c': temperature, 'wind_kmh': round(wind*3.6, 1), 'rain_mm_3h': rain,
                'forecast_at': datetime.fromtimestamp(item['dt'], timezone.utc).isoformat(),
                'retrieved_at': data['retrieved_at'], 'arrival_basis': 'estimated' if prediction['predicted_arrival'] else 'scheduled',
                'message': 'Forecast near the selected station, not the entire route. Weather alone cannot establish a train delay. Any extra planning allowance is your choice, not a model prediction.'}
    except (KeyError, TypeError, ValueError, IndexError, OverflowError):
        return unavailable('The weather provider returned an incomplete forecast. The train ETA is unchanged.')
