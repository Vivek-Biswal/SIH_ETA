from unittest.mock import Mock

from services.eta_service import ETAService
from services.train_service import TrainService
from repositories.train_repository import TrainRepository
from database.mock_client import MockSupabaseClient


def train_repo():
    repo = Mock()
    repo.data_source = "demo"
    repo.get_train_by_number.return_value = {"train_number": "12301", "train_name": "Test Express"}
    repo.get_latest_journey.return_value = {
        "id": "j1", "start_date": "2026-09-20", "status": "running",
        "train_states": {"delay_minutes": 12, "current_station_code": "CCC", "updated_at": None},
    }
    repo.get_station_ref.return_value = {"code": "CCC", "name": "Destination"}
    repo.get_schedule.return_value = [{
        "station_code": "CCC", "station": {"code": "CCC", "name": "Destination"},
        "scheduled_arrival": "10:00",
    }]
    repo.get_station_observations.return_value = []
    repo.search_trains.return_value = ([{
        "train_number": "12301", "train_name": "Test Express",
        "from_station_ref": {"code": "AAA", "name": "Origin"},
        "to_station_ref": {"code": "CCC", "name": "Destination"},
    }], 1)
    return repo


def test_mock_client_provenance_is_not_live():
    repo = TrainRepository.__new__(TrainRepository)
    repo._db = MockSupabaseClient()
    assert repo.data_source == "demo"


def test_mock_null_filter_supports_eta_repository_query():
    result = MockSupabaseClient().table("eta_predictions").select("*").is_("scenario_id", "null").execute()
    assert result.data == []


def test_demo_search_preserves_station_joins():
    repo = TrainRepository.__new__(TrainRepository)
    repo._db = MockSupabaseClient()
    result = TrainService(repo).search_trains("HWH", "NDLS", None, 1, 20)
    assert result.trains[0].from_station.code == "HWH"
    assert result.trains[0].to_station.code == "NDLS"


def test_passenger_status_and_search_preserve_contract_and_provenance():
    service = TrainService(train_repo())
    status = service.get_train_status("12301", None)
    assert status.data_source == "demo"
    assert status.overall_delay_minutes == 12
    assert status.route[0].station.code == "CCC"
    search = service.search_trains("AAA", "CCC", None, 1, 20)
    assert search.data_source == "demo"
    assert search.trains[0].from_station.code == "AAA"


def test_schedule_only_branch_explicit_even_with_legacy_predicted_field():
    eta_repo = Mock()
    eta_repo.get_predictions.return_value = []
    eta_repo.get_delay_dna.return_value = []
    adapter = Mock()
    adapter.predict_eta.return_value = None
    result = ETAService(train_repo(), eta_repo, adapter).get_train_eta("12301", None)
    assert result.prediction_method == "schedule_only"
    assert result.data_source == "demo"
    assert result.remaining_stations[0].predicted_arrival == "10:00"
    assert result.remaining_stations[0].predicted_delay_minutes == 12


def test_stored_branch_does_not_depend_on_model_version_label():
    eta_repo = Mock()
    eta_repo.get_predictions.return_value = [{
        "prediction_timestamp": "2026-09-20T04:00:00Z", "station_code": "CCC",
        "station": {"code": "CCC", "name": "Destination"},
        "predicted_arr": "10:12", "predicted_arr_delay": 12, "model_version": "baseline-v0",
    }]
    eta_repo.get_delay_dna.return_value = []
    adapter = Mock()
    adapter.predict_eta.return_value = None
    result = ETAService(train_repo(), eta_repo, adapter).get_train_eta("12301", None)
    assert result.prediction_method == "stored"
    assert result.remaining_stations[0].predicted_arrival == "10:12"
