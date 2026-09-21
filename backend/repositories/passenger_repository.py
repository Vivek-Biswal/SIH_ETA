"""Read-only passenger directory queries; never return demo operational data."""
from repositories.train_repository import TrainRepository


class PassengerRepository(TrainRepository):
    def lookup(self, query: str) -> list[dict]:
        column = "train_number" if query.isdigit() else "train_name"
        return (self._db.table("trains")
                .select("train_number, train_name, departure_time, arrival_time, days_of_run")
                .ilike(column, f"%{query}%").order("train_number")
                .limit(30).execute()).data or []

    def departures(self, station_code: str) -> list[dict]:
        return (self._db.table("schedules")
                .select("train_number, scheduled_arrival, scheduled_departure")
                .eq("station_code", station_code.upper())
                .order("scheduled_departure").limit(100).execute()).data or []
