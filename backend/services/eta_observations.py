"""Keep bounded, credential-free provider observations for future ETA training.

Collection reuses successful passenger fetches; it never contacts a provider.
The archive contains observations as received, including provider ``actual*``
values that must still be checked against the observation time when training.
Export is an offline operation and is deliberately not an HTTP endpoint.
"""
from datetime import date, datetime, timedelta, timezone
import json
import math
from pathlib import Path
import re
import sqlite3
import uuid
import zlib

from config.settings import settings


MAX_SNAPSHOTS = 20_000
RETENTION_DAYS = 180
MAX_ROUTE_STOPS = 2_000
MAX_SNAPSHOT_BYTES = 2_000_000
_TRAIN_NUMBER = re.compile(r"[0-9]{5}\Z")
_JOURNEY_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}\Z")
_TEXT_FIELDS = {
    "trainName", "status", "stationCode", "stationName", "scheduledArrival",
    "scheduledDeparture", "actualArrival", "actualDeparture", "platform",
    "updatedAt", "timestamp", "arrival", "departure",
}
_NUMBER_FIELDS = {
    "delayMinutes", "delayArrival", "delayDeparture", "sequence", "latitude",
    "longitude", "speedKmh", "bearingDegrees", "segmentProgress", "distance",
    "distanceFromStart", "distanceFromOrigin", "distanceToNextStation",
    "distanceFromLastStation", "haltMinutes", "scheduledHaltMinutes",
}
_BOOL_FIELDS = {"isLive", "isHalt", "hasArrived", "hasDeparted"}
_TOP_FIELDS = {"trainName", "isLive", "status", "delayMinutes"}
_LOCATION_FIELDS = {
    "stationCode", "stationName", "sequence", "latitude", "longitude",
    "speedKmh", "bearingDegrees", "segmentProgress", "distanceFromStart",
    "distanceFromOrigin", "distanceToNextStation", "distanceFromLastStation",
    "updatedAt", "timestamp", "status",
}
_ROUTE_FIELDS = {
    "stationCode", "stationName", "sequence", "latitude", "longitude",
    "scheduledArrival", "scheduledDeparture", "actualArrival", "actualDeparture",
    "delayArrival", "delayDeparture", "status", "distance", "distanceFromStart",
    "distanceFromOrigin", "distanceToNextStation", "haltMinutes",
    "scheduledHaltMinutes", "isHalt", "hasArrived", "hasDeparted", "platform",
}


def _time(value):
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and len(value) <= 64:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return None
    return parsed.astimezone(timezone.utc)


def _iso(value):
    return value.isoformat().replace("+00:00", "Z")


def _fields(source, allowed):
    """Copy only known scalar telemetry, never arbitrary nested provider data."""
    result = {}
    for field in allowed:
        value = source.get(field)
        if value is None:
            continue
        if field in _TEXT_FIELDS and isinstance(value, str):
            result[field] = value[:256]
        elif field == "platform" and type(value) is int:
            result[field] = value
        elif field in _NUMBER_FIELDS and type(value) in (int, float):
            # Restrict huge integers before float conversion, which can overflow.
            if -1_000_000_000 <= value <= 1_000_000_000 and math.isfinite(value):
                result[field] = value
        elif field in _BOOL_FIELDS and type(value) is bool:
            result[field] = value
    return result


def _snapshot(data, received_at):
    if not isinstance(data, dict) or data.get("_railradar_stale"):
        return None
    number = data.get("trainNumber")
    if type(number) is int:
        number = str(number)
    journey_date = data.get("startDate")
    if (not isinstance(number, str) or not _TRAIN_NUMBER.fullmatch(number)
            or not isinstance(journey_date, str) or not _JOURNEY_DATE.fullmatch(journey_date)):
        return None
    try:
        date.fromisoformat(journey_date)
    except ValueError:
        return None
    observed_at = _time(data.get("lastUpdatedAt"))
    if observed_at is None or observed_at > received_at:
        return None
    route = data.get("route")
    if (not isinstance(route, list) or not route or len(route) > MAX_ROUTE_STOPS
            or any(not isinstance(stop, dict) for stop in route)):
        return None
    clean = _fields(data, _TOP_FIELDS)
    clean.update(trainNumber=number, startDate=journey_date, lastUpdatedAt=_iso(observed_at))
    location = data.get("currentLocation")
    if isinstance(location, dict):
        clean["currentLocation"] = _fields(location, _LOCATION_FIELDS)
    clean["route"] = [_fields(stop, _ROUTE_FIELDS) for stop in route]
    return clean, observed_at


def _local_path(value):
    # Even offline tools must never interpret a URL as a provider fetch target.
    if not isinstance(value, (str, Path)) or "://" in str(value) or str(value) == ":memory:":
        raise ValueError("Use a local ETA archive file path.")
    return Path(value)


def record_observation(data, received_at=None, path=None):
    """Return True only when a new valid snapshot was saved; failures are harmless.

    ``received_at`` accepts an aware datetime or ISO timestamp for repeatable
    replay/tests. Provider timestamps later than receipt and stale cache fallbacks
    are never collected. A repeated provider timestamp keeps its original record.
    """
    try:
        received = datetime.now(timezone.utc) if received_at is None else _time(received_at)
        if received is None:
            return False
        snapshot = _snapshot(data, received)
        if snapshot is None:
            return False
        clean, observed = snapshot
        encoded = json.dumps(clean, allow_nan=False, separators=(",", ":")).encode("utf-8")
        if len(encoded) > MAX_SNAPSHOT_BYTES:
            return False
        archive = _local_path(path if path is not None else settings.ETA_HISTORY_PATH)
        archive.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(str(archive), timeout=2) as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS eta_observations (
                    id INTEGER PRIMARY KEY,
                    train_number TEXT NOT NULL,
                    journey_date TEXT NOT NULL,
                    observed_at TEXT NOT NULL,
                    received_at TEXT NOT NULL,
                    received_epoch REAL NOT NULL,
                    snapshot BLOB NOT NULL,
                    UNIQUE(train_number, journey_date, observed_at)
                );
                CREATE INDEX IF NOT EXISTS eta_observations_received
                    ON eta_observations(received_epoch);
            """)
            cursor = db.execute("""INSERT OR IGNORE INTO eta_observations
                (train_number,journey_date,observed_at,received_at,received_epoch,snapshot)
                VALUES (?,?,?,?,?,?)""", (
                clean["trainNumber"], clean["startDate"], _iso(observed), _iso(received),
                received.timestamp(), zlib.compress(encoded),
            ))
            inserted = cursor.rowcount == 1
            cutoff = (received - timedelta(days=RETENTION_DAYS)).timestamp()
            db.execute("DELETE FROM eta_observations WHERE received_epoch < ?", (cutoff,))
            db.execute("""DELETE FROM eta_observations WHERE id IN (
                SELECT id FROM eta_observations ORDER BY received_epoch DESC,id DESC
                LIMIT -1 OFFSET ?
            )""", (MAX_SNAPSHOTS,))
        return inserted
    except (OSError, sqlite3.Error, ValueError, TypeError, OverflowError, AttributeError):
        # Collection must not change ETA availability or emit payloads/credentials.
        return False


def export_observations(path, output_path):
    """Export a local archive as JSONL, atomically; return the exported row count.

    Failures raise a fixed message without including database paths or payloads.
    This function neither creates a missing input database nor contacts a network.
    """
    temporary = None
    try:
        archive, output = _local_path(path).resolve(), _local_path(output_path).resolve()
        if archive == output or not archive.is_file():
            raise ValueError("Invalid local archive input or output.")
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_name(output.name + "." + uuid.uuid4().hex + ".tmp")
        count = 0
        with sqlite3.connect(archive.as_uri() + "?mode=ro", uri=True, timeout=2) as db:
            with temporary.open("w", encoding="utf-8", newline="\n") as stream:
                rows = db.execute("""SELECT observed_at,received_at,snapshot
                    FROM eta_observations ORDER BY observed_at,train_number,journey_date""")
                for observed_at, received_at, compressed in rows:
                    raw = zlib.decompressobj().decompress(compressed, MAX_SNAPSHOT_BYTES + 1)
                    if len(raw) > MAX_SNAPSHOT_BYTES:
                        raise ValueError("Invalid ETA archive entry.")
                    # Reapply the whitelist so a modified local DB cannot export
                    # arbitrary stored payload fields or old collector schemas.
                    snapshot = _snapshot(json.loads(raw), _time(received_at))
                    if snapshot is None or _iso(snapshot[1]) != observed_at:
                        raise ValueError("Invalid ETA archive entry.")
                    row = {"schema_version": 1, "provider": "railradar",
                           "received_at": received_at, "observed_at": observed_at,
                           "data": snapshot[0]}
                    stream.write(json.dumps(row, allow_nan=False, separators=(",", ":")) + "\n")
                    count += 1
        temporary.replace(output)
        return count
    except (OSError, sqlite3.Error, ValueError, TypeError, OverflowError, AttributeError, zlib.error):
        raise ValueError("Unable to export the local ETA observation archive.") from None
    finally:
        if temporary is not None:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass
