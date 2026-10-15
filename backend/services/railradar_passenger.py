"""Optional authenticated live adapter. No synthetic fallback or inferred causes.

Contract: https://railradar.in/docs/live-train-status
The key stays on the server. Missing keys leave existing database routes intact.
"""
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from config.settings import settings
from services import railradar_requests


def configured():
    return bool(railradar_requests.configured_keys())


def resource(path, params=None):
    """Fetch a documented directory/timetable resource; no credentials reach clients."""
    # Only directory/timetable resources use this path. Live observations use fetch_live.
    params = dict(params or {})
    if 'q' in params:
        params['q'] = params['q'].strip().casefold()
    ttl = 86400 if path.startswith('lookup/') else 21600
    return railradar_requests.get(path, params, ttl=ttl)


def lookup_stations(query):
    rows = resource("lookup/search/stations", {"q": query, "limit": 20})
    if not isinstance(rows, list) or any(not isinstance(r, dict) or not r.get("code") or not r.get("name") for r in rows):
        raise HTTPException(503, "Station directory information is unavailable.")
    return {"data_source": "database", "results": [{"code": r["code"], "name": r["name"]} for r in rows]}


def lookup_trains(query):
    rows = resource("lookup/search/trains", {"q": query, "limit": 20})
    if not isinstance(rows, list) or any(not isinstance(r, dict) or not r.get("number") or not r.get("name") for r in rows):
        raise HTTPException(503, "Train directory information is unavailable.")
    return {"data_source": "database", "results": [{"train_number": str(r["number"]), "train_name": r["name"]} for r in rows]}


def board(code):
    data = resource(f"stations/{code.upper()}/trains")
    try:
        rows = [{"train_number": str(r["train"]["number"]), "train_name": r["train"]["name"],
                 "scheduled_departure": r["stop"]["departure"]}
                for r in data["trains"] if r["stop"].get("departure")]
    except (KeyError, TypeError, AttributeError):
        raise HTTPException(503, "Station timetable information is unavailable.")
    return {"data_source": "database", "board_type": "scheduled", "live_available": False, "results": rows}


def between(origin, destination, date, page, limit):
    if not origin.isalnum() or not destination.isalnum():
        raise HTTPException(422, "Enter valid station codes.")
    day = date or datetime.now(timezone(timedelta(hours=5, minutes=30))).date().isoformat()
    data = resource(f"trains/between/{origin.upper()}/{destination.upper()}", {"date": day})
    try:
        rows = [{"train_number": str(r["train"]["number"]), "train_name": r["train"]["name"],
                 "from_station": data["from"], "to_station": data["to"],
                 "departure_time": r["from"].get("departure"), "arrival_time": r["to"].get("arrival"),
                 "days_of_run": r["train"].get("runDays"), "duration_minutes": r.get("duration")}
                for r in data["trains"]]
    except (KeyError, TypeError, AttributeError):
        raise HTTPException(503, "Route timetable information is unavailable.")
    return {"data_source": "database", "total": len(rows), "page": page, "limit": limit,
            "trains": rows[(page - 1) * limit:page * limit]}


def fetch_live(number: str, date: str | None):
    if len(number) != 5 or not number.isdigit():
        raise HTTPException(422, "Enter a five-digit train number.")
    if date:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(422, "Use YYYY-MM-DD for the journey start date.")
    def validate(data):
        if (not isinstance(data, dict)
                or str(data.get("trainNumber")) != number
                or not isinstance(data.get("route"), list)
                or not data.get("trainName") or not data.get("startDate")
                or (date is not None and data["startDate"] != date)):
            raise ValueError("Provider contract mismatch")
    path = f'trains/{number}/live'
    params = {'date': date} if date else {}
    data = railradar_requests.get(path, params, ttl=settings.RAILRADAR_LIVE_CACHE_SECONDS,
                                 validate=validate, stale_ttl=21600)
    if date is None and not data.get('_railradar_stale'):
        # The undated status response already contains the exact journey date.
        # Reuse that observation for the following ETA/weather request.
        railradar_requests.manager().alias(path, {}, {'date': data['startDate']})
    return data


def timestamp(value):
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return result if result.tzinfo else None
    except (TypeError, ValueError, AttributeError):
        return None


def fresh(data, now):
    observed = timestamp(data.get("lastUpdatedAt"))
    return bool(not data.get('_railradar_stale') and data.get("isLive") is True and observed
                and timedelta(0) <= now - observed <= timedelta(minutes=5))


def station(row):
    code = row.get("stationCode")
    if not code:
        return None
    result = {"code": code, "name": row.get("stationName") or ""}
    # RailRadar includes station geography on many route records. Preserve it
    # in the passenger contract so clients can draw the verified route without
    # making one station-detail request per stop.
    for field in ("latitude", "longitude"):
        value = row.get(field)
        try:
            value = float(value)
        except (TypeError, ValueError):
            continue
        if field == "latitude" and -90 <= value <= 90:
            result[field] = value
        elif field == "longitude" and -180 <= value <= 180:
            result[field] = value
    return result


def status_response(data, now=None):
    now = now or datetime.now(timezone.utc)
    location = data.get("currentLocation") or {}
    current_code = location.get("stationCode")
    route = [{
        "station": station(row), "scheduled_arrival": row.get("scheduledArrival"),
        "scheduled_departure": row.get("scheduledDeparture"),
        "actual_arrival": row.get("actualArrival"), "actual_departure": row.get("actualDeparture"),
        "delay_minutes": row.get("delayArrival"), "has_departed": bool(row.get("actualDeparture")),
        "platform": str(row["platform"]) if row.get("platform") is not None else None,
    } for row in data["route"]]
    current = next((row["station"] for row in route if row["station"] and row["station"]["code"] == current_code), None)
    
    # Calculate derived position based on sequence and segmentProgress
    derived_lat = None
    derived_lng = None
    seq = location.get("sequence")
    progress = location.get("segmentProgress", 0.0)
    if progress and progress > 1.0:
        progress = progress / 100.0  # normalize to 0-1 if it's a percentage

    if seq is not None and isinstance(data.get("route"), list):
        curr_row = next((r for r in data["route"] if r.get("sequence") == seq), None)
        nxt_row = next((r for r in data["route"] if r.get("sequence") == seq + 1), None)

        if curr_row and nxt_row:
            lat1, lon1 = curr_row.get("latitude"), curr_row.get("longitude")
            lat2, lon2 = nxt_row.get("latitude"), nxt_row.get("longitude")
            if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
                try:
                    derived_lat = float(lat1) + (float(lat2) - float(lat1)) * progress
                    derived_lng = float(lon1) + (float(lon2) - float(lon1)) * progress
                except (ValueError, TypeError):
                    pass
        elif curr_row:
            lat1, lon1 = curr_row.get("latitude"), curr_row.get("longitude")
            if lat1 is not None and lon1 is not None:
                try:
                    derived_lat = float(lat1)
                    derived_lng = float(lon1)
                except (ValueError, TypeError):
                    pass

    last_known = None
    if timestamp(data.get("lastUpdatedAt")):
        last_known = {
            "station": current,
            "delay_minutes": data.get("delayMinutes", 0),
            "updated_at": data.get("lastUpdatedAt"),
            "latitude": derived_lat,
            "longitude": derived_lng,
            "speed_kmh": location.get("speedKmh"),
            "bearing_degrees": location.get("bearingDegrees"),
            "position_source": "telemetry_derived" if derived_lat is not None else None,
            "position_updated_at": data.get("lastUpdatedAt") if derived_lat is not None else None,
        }

    return {
        "train_number": str(data["trainNumber"]), "train_name": data["trainName"],
        "date": data["startDate"], "data_source": "live" if fresh(data, now) else "cached",
        "current_station": current, "overall_delay_minutes": data.get("delayMinutes", 0), "status": data.get("status") or "unknown", "route": route,
        "last_known_location": last_known,
    }


def eta_response(data, now=None):
    now = now or datetime.now(timezone.utc)
    delay = data.get("delayMinutes")
    state = str(data.get("status", "")).lower().replace("_", "-")
    not_running = state in {"not-started", "cancelled", "canceled", "completed", "terminated"}
    usable = fresh(data, now) and type(delay) is int and not not_running
    predictions = []
    for row in data["route"]:
        scheduled = timestamp(row.get("scheduledArrival"))
        upcoming = row.get("status") == "upcoming" and not row.get("actualArrival")
        estimated = scheduled + timedelta(minutes=delay) if usable and scheduled and upcoming else None
        if estimated and estimated < now:
            estimated = None
        predictions.append({"station": station(row), "scheduled_arrival": row.get("scheduledArrival"),
                            "predicted_arrival": estimated.isoformat() if estimated else None,
                            "predicted_delay_minutes": delay if estimated else None, "prediction_confidence": None})
    adjusted = any(row["predicted_arrival"] for row in predictions)
    return {
        "train_number": str(data["trainNumber"]), "train_name": data["trainName"], "date": data["startDate"],
        "data_source": "live" if fresh(data, now) else "cached",
        "prediction_method": "delay_adjusted" if adjusted else "schedule_only",
        "model_version": "observed-delay-baseline-v1", "prediction_generated_at": now.isoformat() if adjusted else None,
        "remaining_stations": predictions, "delay_factors": [], "confidence_score": None, "overall_delay_minutes": delay,
        "explanation": "Scheduled arrival plus the latest reported running delay. Assumes the delay persists; no recovery or additional disruption is inferred." if adjusted else ("This journey has not started or is no longer running. The timetable is available, but a live arrival estimate cannot be calculated." if not_running else "No fresh running observation and upcoming dated arrival are available for an adjusted prediction."),
        "observation_timestamp": data.get("lastUpdatedAt"),
    }
