"""Optional authenticated live adapter. No synthetic fallback or inferred causes.

Contract: https://railradar.in/docs/live-train-status
The key stays on the server. Missing keys leave existing database routes intact.
"""
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from threading import Lock
from time import monotonic

import httpx
from fastapi import HTTPException
from config.settings import settings

_cache = OrderedDict()
_lock = Lock()


def configured():
    return bool(settings.RAILRADAR_API_KEY)


def resource(path, params=None):
    """Fetch a documented directory/timetable resource; no credentials reach clients."""
    try:
        response = httpx.get(f"https://api.railradar.in/v1/{path}",
                            params=params or {}, timeout=10,
                            headers={"Authorization": f"Bearer {settings.RAILRADAR_API_KEY}"})
        response.raise_for_status()
        payload = response.json()
        if payload.get("success") is not True or not isinstance(payload.get("data"), (dict, list)):
            raise ValueError("Invalid provider response")
        return payload["data"]
    except (httpx.HTTPError, ValueError, TypeError):
        raise HTTPException(503, "Railway directory information is temporarily unavailable.")


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
    data = resource(f"trains/between/{origin.upper()}/{destination.upper()}", {"date": date} if date else {})
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
    cache_key = (number, date)
    with _lock:
        cached = _cache.get(cache_key)
        if cached and monotonic() - cached[0] < 30:
            return cached[1]
    try:
        response = httpx.get(
            f"https://api.railradar.in/v1/trains/{number}/live",
            headers={"Authorization": f"Bearer {settings.RAILRADAR_API_KEY}"},
            params={"date": date} if date else {}, timeout=10,
        )
        if response.status_code == 404:
            raise HTTPException(404, "No provider record exists for this train and date.")
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data")
        if (payload.get("success") is not True or not isinstance(data, dict)
                or str(data.get("trainNumber")) != number
                or not isinstance(data.get("route"), list)
                or not data.get("trainName") or not data.get("startDate")
                or (date is not None and data["startDate"] != date)):
            raise ValueError("Provider contract mismatch")
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, TypeError):
        # Do not leak provider response bodies, credentials or substitute demo data.
        raise HTTPException(503, "Live railway information is temporarily unavailable.")
    with _lock:
        _cache[cache_key] = (monotonic(), data)
        _cache.move_to_end(cache_key)
        while len(_cache) > 128:
            _cache.popitem(last=False)
    return data


def timestamp(value):
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return result if result.tzinfo else None
    except (TypeError, ValueError, AttributeError):
        return None


def fresh(data, now):
    observed = timestamp(data.get("lastUpdatedAt"))
    return bool(data.get("isLive") is True and observed
                and timedelta(0) <= now - observed <= timedelta(minutes=5))


def station(row):
    code = row.get("stationCode")
    return {"code": code, "name": row.get("stationName") or ""} if code else None


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
    return {
        "train_number": str(data["trainNumber"]), "train_name": data["trainName"],
        "date": data["startDate"], "data_source": "live" if fresh(data, now) else "cached",
        "current_station": current, "overall_delay_minutes": data.get("delayMinutes"), "status": data.get("status") or "unknown", "route": route,
        "last_known_location": {"station": current, "delay_minutes": data.get("delayMinutes"),
                                "updated_at": data.get("lastUpdatedAt")}
                               if timestamp(data.get("lastUpdatedAt")) else None,
    }


def eta_response(data, now=None):
    now = now or datetime.now(timezone.utc)
    delay = data.get("delayMinutes")
    usable = fresh(data, now) and type(delay) is int
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
        "explanation": "Scheduled arrival plus the latest reported running delay. Assumes the delay persists; no recovery or additional disruption is inferred." if adjusted else "No fresh observation is available for an adjusted prediction.",
        "observation_timestamp": data.get("lastUpdatedAt"),
    }
