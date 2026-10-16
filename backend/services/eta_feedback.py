"""Bounded passenger reports. Self-reports are never ETA training labels."""
import json
from pathlib import Path
import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from config.settings import settings


def record_feedback(report):
    payload = report.model_dump(mode="json")
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    now = datetime.now(timezone.utc)
    try:
        path = Path(settings.ETA_FEEDBACK_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(str(path), timeout=3) as db:
            db.execute("CREATE TABLE IF NOT EXISTS passenger_eta_feedback "
                       "(report_id TEXT PRIMARY KEY, received_at TEXT NOT NULL, payload TEXT NOT NULL)")
            db.execute("BEGIN IMMEDIATE")
            previous = db.execute("SELECT payload FROM passenger_eta_feedback WHERE report_id=?",
                                  (report.report_id,)).fetchone()
            if previous:
                if previous[0] != encoded:
                    raise HTTPException(409, "This report identifier already has different contents.")
                return {"report_id": report.report_id, "status": "received", "verified": False}
            db.execute("DELETE FROM passenger_eta_feedback WHERE received_at < ?",
                       ((now - timedelta(days=90)).isoformat(),))
            if db.execute("SELECT COUNT(*) FROM passenger_eta_feedback").fetchone()[0] >= 10000:
                raise HTTPException(503, "Feedback storage is full. Keep your device copy and retry later.")
            db.execute("INSERT INTO passenger_eta_feedback VALUES (?, ?, ?)",
                       (report.report_id, now.isoformat(), encoded))
        return {"report_id": report.report_id, "status": "received", "verified": False}
    except (OSError, sqlite3.Error, ValueError):
        raise HTTPException(503, "Feedback cannot be saved right now. Keep your device copy and retry later.") from None
