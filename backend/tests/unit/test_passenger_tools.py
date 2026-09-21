import pytest
from fastapi import HTTPException
from api.routes import passenger
from services.eta_service import ETAService


def test_demo_directory_is_unavailable(monkeypatch):
    class Demo:
        data_source = "demo"
    monkeypatch.setattr(passenger, "PassengerRepository", Demo)
    with pytest.raises(HTTPException) as error:
        passenger.lookup("Rajdhani")
    assert error.value.status_code == 503


def test_board_omits_terminal_arrivals_and_labels_schedule(monkeypatch):
    class Real:
        data_source = "database"
        def departures(self, station):
            assert station == "NDLS"
            return [{"train_number": "1", "scheduled_departure": "10:30"},
                    {"train_number": "2", "scheduled_departure": None}]
    monkeypatch.setattr(passenger, "PassengerRepository", Real)
    result = passenger.departures("NDLS")
    assert result["live_available"] is False
    assert result["board_type"] == "scheduled"
    assert len(result["results"]) == 1


def test_no_delay_cause_is_invented_for_missing_evidence():
    service = ETAService.__new__(ETAService)
    assert service._build_delay_factors(None, 15) == []
