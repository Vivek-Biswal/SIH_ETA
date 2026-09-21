"""Additional passenger tools. Schedules are explicitly not live departures."""
from fastapi import APIRouter, HTTPException, Query
from repositories.passenger_repository import PassengerRepository
from services import railradar_passenger

router = APIRouter(prefix="/api/v1/passenger", tags=["passenger"])


def repository():
    repo = PassengerRepository()
    if repo.data_source != "database":
        raise HTTPException(503, "Verified railway data is not connected.")
    return repo


@router.get("/lookup")
def lookup(q: str = Query(..., min_length=2, max_length=60, pattern=r"^[\w\s-]+$")):
    if railradar_passenger.configured():
        return railradar_passenger.lookup_trains(q.strip())
    return {"data_source": "database", "results": repository().lookup(q.strip())}


@router.get("/departures/{station_code}")
def departures(station_code: str):
    if not station_code.isalnum() or not 2 <= len(station_code) <= 10:
        raise HTTPException(422, "Enter a valid station code.")
    if railradar_passenger.configured():
        return railradar_passenger.board(station_code)
    rows = repository().departures(station_code)
    return {"data_source": "database", "board_type": "scheduled",
            "live_available": False,
            "results": [row for row in rows if row.get("scheduled_departure")]}
