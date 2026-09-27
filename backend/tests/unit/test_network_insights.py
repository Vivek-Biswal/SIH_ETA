import csv
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from services.network_insights import NetworkInsightsService


def write_csv(root, name, rows):
    with (root / name).open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


@pytest.fixture
def analysis(tmp_path):
    write_csv(tmp_path, 'network_bottlenecks.csv', [
        dict(station='NDLS', interactions=2, high_risk_interactions=1,
             mean_source_delay=18, mean_gap=7, mean_risk=.58, bottleneck_score=.8),
        dict(station='CNB', interactions=1, high_risk_interactions=0,
             mean_source_delay=4, mean_gap=20, mean_risk=.45, bottleneck_score=.2),
    ])
    write_csv(tmp_path, 'operational_risk.csv', [
        dict(service_date='2024-09-17', station='NDLS', source_train='2394',
             target_train='12301', source_arr_delay=28, target_arr_delay=4,
             gap_minutes=5, risk_score=.61),
        dict(service_date='2024-09-19', station='CNB', source_train='12423',
             target_train='12001', source_arr_delay=4, target_arr_delay=0,
             gap_minutes=20, risk_score=.45),
    ])
    return tmp_path


def test_dated_analysis_is_historical_and_sorted(analysis):
    result = NetworkInsightsService(analysis).get_insights(limit=1)
    assert result['data_source'] == 'historical'
    assert result['live_available'] is False
    assert (result['period_start'], result['period_end']) == ('2024-09-17', '2024-09-19')
    assert result['station_count'] == 2
    assert result['interaction_count'] == 2
    assert result['high_risk_count'] == 1
    assert len(result['stations']) == len(result['interactions']) == 1
    assert result['interactions'][0]['source_train'] == '02394'
    assert result['stations'][0]['station'] == 'NDLS'


def test_search_covers_station_train_and_empty_results(analysis):
    service = NetworkInsightsService(analysis)
    assert service.get_insights(' ndls ')['interaction_count'] == 1
    result = service.get_insights('12423')
    assert result['stations'][0]['station'] == 'CNB'
    assert result['interaction_count'] == 1
    result = service.get_insights('UNKNOWN')
    assert result['stations'] == result['interactions'] == []
    assert result['interaction_count'] == 0


def test_cache_invalidates_when_output_changes(analysis):
    service = NetworkInsightsService(analysis)
    service.get_insights()
    file = analysis / 'operational_risk.csv'
    previous_time = file.stat().st_mtime_ns
    file.write_text(file.read_text().replace('2024-09-19', '2024-10-19'))
    os.utime(file, ns=(previous_time, previous_time + 2_000_000_000))
    assert service.get_insights()['period_end'] == '2024-10-19'


def test_missing_corrupt_or_non_finite_analysis_fails(analysis):
    file = analysis / 'operational_risk.csv'
    file.write_text(file.read_text().replace('0.61', 'nan'))
    with pytest.raises(ValueError):
        NetworkInsightsService(analysis).get_insights()
    file.unlink()
    with pytest.raises(OSError):
        NetworkInsightsService(analysis).get_insights()


def test_insights_endpoint_validates_and_handles_unavailable(analysis, monkeypatch):
    from main import app
    monkeypatch.setenv('NETWORK_ANALYSIS_DIR', str(analysis))
    with TestClient(app) as client:
        response = client.get('/api/v1/network/insights?q=02394&limit=1')
        assert response.status_code == 200
        assert response.json()['interactions'][0]['source_train'] == '02394'
        assert client.get('/api/v1/network/insights?q=%3Cscript%3E').status_code == 422
        assert client.get('/api/v1/network/insights?limit=101').status_code == 422
        monkeypatch.setenv('NETWORK_ANALYSIS_DIR', str(analysis / 'missing'))
        response = client.get('/api/v1/network/insights')
        assert response.status_code == 503
        assert str(analysis) not in response.text


def test_repository_analysis_directory_resolves_inside_repository():
    from services.providers.real_network_provider import NOTEBOOKS_DIR
    from services.network_insights import DEFAULT_OUTPUTS
    assert NOTEBOOKS_DIR == DEFAULT_OUTPUTS
    assert DEFAULT_OUTPUTS == Path(__file__).resolve().parents[3] / 'notebooks' / 'outputs'
