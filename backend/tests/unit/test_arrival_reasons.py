"""Per-stop passenger evidence, using fixtures and no railway/weather API calls."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest

from services import eta_ml
from services.railradar_passenger import eta_response, status_response


NOW = datetime(2026, 10, 16, 10, 1, tzinfo=timezone.utc)


def journey(delay=12):
    return {'trainNumber': '18102', 'trainName': 'Test train', 'startDate': '2026-10-16',
            'status': 'running', 'isLive': True, 'lastUpdatedAt': '2026-10-16T10:00:00Z', 'delayMinutes': delay,
            'currentLocation': {'stationCode': 'TATA', 'sequence': 1}, 'route': [
                {'stationCode': 'TATA', 'stationName': 'Tatanagar', 'sequence': 1, 'status': 'departed', 'isHalt': True,
                 'scheduledArrival': '2026-10-16T09:43:00Z', 'scheduledDeparture': '2026-10-16T09:48:00Z',
                 'actualArrival': '2026-10-16T09:55:00Z', 'actualDeparture': '2026-10-16T10:00:00Z'},
                {'stationCode': 'KND', 'stationName': 'Kandra', 'sequence': 2, 'status': 'upcoming',
                 'scheduledArrival': '2026-10-16T11:00:00Z'},
                {'stationCode': 'PRR', 'stationName': 'Purulia', 'sequence': 3, 'status': 'upcoming',
                 'scheduledArrival': '2026-10-16T12:00:00Z'}]}


@pytest.mark.parametrize(('delay', 'status', 'clock', 'description'), [
    (0, 'on_time', '4:30 PM IST', 'on time'),
    (-7, 'early', '4:23 PM IST', '7 minutes early'),
    (64, 'delayed', '5:34 PM IST', '64 minutes late'),
])
def test_early_on_time_and_late_copy_contains_station_and_its_arrival(delay, status, clock, description):
    result = eta_response(journey(delay), NOW)['remaining_stations'][1]
    reason = result['arrival_explanation']
    assert reason['status'] == status
    assert 'Kandra' in reason['summary'] and clock in reason['summary'] and description in reason['summary']
    assert ('The railway update has not given a reason for the delay.' in reason['details']) == (delay > 0)


def test_same_reported_delay_still_has_distinct_station_and_arrival_without_invented_cause():
    data = journey(64)
    data.update(delayReason='Signal failure', weather='Heavy rain', incident={'cause': 'platform occupied'})
    first, second = eta_response(data, NOW)['remaining_stations'][1:]
    assert first['predicted_delay_minutes'] == second['predicted_delay_minutes'] == 64
    assert first['arrival_explanation']['summary'] != second['arrival_explanation']['summary']
    assert 'Kandra' in first['arrival_explanation']['summary'] and '5:34 PM IST' in first['arrival_explanation']['summary']
    assert 'Purulia' in second['arrival_explanation']['summary'] and '6:34 PM IST' in second['arrival_explanation']['summary']
    assert 'signal' not in str(first['arrival_explanation']).lower()
    assert 'platform' not in str(first['arrival_explanation']).lower()
    assert 'rain' not in ' '.join(first['arrival_explanation']['details']).lower().replace('train', '')


def test_model_recovery_and_additional_delay_are_specific_forecasts_not_claimed_causes(monkeypatch):
    data = journey()
    monkeypatch.setattr(eta_ml, 'predict', lambda *args: ({
        1: {'arrival': datetime(2026,10,16,11,8,tzinfo=timezone.utc), 'delay': 8},
        2: {'arrival': datetime(2026,10,16,12,20,tzinfo=timezone.utc), 'delay': 20},
    }, {'name': 'test-model', 'status': 'validated_pilot'}))
    first, second = eta_response(data, NOW)['remaining_stations'][1:]
    assert 'make up about 4 minutes before reaching Kandra' in ' '.join(first['arrival_explanation']['details'])
    assert 'take about 8 minutes longer than planned before reaching Purulia' in ' '.join(second['arrival_explanation']['details'])
    assert first['predicted_delay_minutes'] == 8 and second['predicted_delay_minutes'] == 20
    assert 'has not given a reason' in ' '.join(first['arrival_explanation']['details'])


def test_confirmed_extra_dwell_is_reported_as_fact_without_guessing_its_cause():
    data = journey()
    data['route'][0]['actualArrival'] = '2026-10-16T09:40:00Z'
    details = eta_response(data, NOW)['remaining_stations'][1]['arrival_explanation']['details']
    assert 'At Tatanagar, the train stopped for 20 minutes instead of the planned 5 minutes, adding 12 minutes to its delay.' in details
    assert 'signal' not in ' '.join(details).lower()
    assert 'reason for the delay' in details[-1]


def test_confirmed_past_arrival_is_recorded_not_predicted_even_when_snapshot_is_old():
    data = journey()
    result = eta_response(data, NOW+timedelta(hours=1))['remaining_stations'][0]
    assert result['actual_arrival'] == '2026-10-16T09:55:00+00:00'
    assert result['predicted_arrival'] is None
    assert result['arrival_explanation']['status'] == 'arrived'
    assert 'The train arrived at Tatanagar' in result['arrival_explanation']['summary']
    assert '12 minutes late' in result['arrival_explanation']['summary']


def test_future_populated_actual_does_not_block_forecast_or_become_an_arrival():
    data = journey(); original = deepcopy(data)
    data['route'][1].update(actualArrival='2026-10-16T11:05:00Z', actualDeparture='2026-10-16T11:10:00Z')
    expected = deepcopy(data)
    status = status_response(data, NOW)['route'][1]
    eta = eta_response(data, NOW)['remaining_stations'][1]
    assert status['actual_arrival'] is None and status['actual_departure'] is None
    assert status['arrival_confirmed'] is False and status['departure_confirmed'] is False and status['has_departed'] is False
    assert eta['actual_arrival'] is None and eta['predicted_arrival'] == '2026-10-16T11:12:00+00:00'
    assert eta['arrival_explanation']['status'] == 'delayed'
    assert data == expected and original != data


@pytest.mark.parametrize('change', [
    lambda d: d.update(lastUpdatedAt='2026-10-16T08:00:00Z'),
    lambda d: d.update(lastUpdatedAt=None),
    lambda d: d.update(lastUpdatedAt='2026-10-16T12:00:00Z'),
    lambda d: d.update(_railradar_stale=True),
    lambda d: d.update(status='unknown'),
    lambda d: d.update(delayMinutes=None),
    lambda d: d['route'][1].update(scheduledArrival='11:00'),
])
def test_unavailable_inputs_never_produce_current_arrival_or_delay_cause(change):
    data = journey(); change(data)
    result = eta_response(data, NOW)['remaining_stations'][1]
    reason = result['arrival_explanation']
    assert result['predicted_arrival'] is None and reason['status'] == 'unavailable'
    assert 'Kandra' in reason['summary'] and 'expected at' not in reason['summary'].lower()
    assert not any('has not given a reason' in line for line in reason['details'])


@pytest.mark.parametrize(('status', 'reason_status', 'message'), [
    ('not-started', 'not_started', 'has not started'),
    ('cancelled', 'cancelled', 'cancelled'),
    ('completed', 'unavailable', 'has ended'),
    ('terminated', 'unavailable', 'has ended'),
])
def test_nonrunning_journey_has_clear_station_specific_reason(status, reason_status, message):
    data = journey(); data['status'] = status
    result = eta_response(data, NOW)['remaining_stations'][1]
    assert result['predicted_arrival'] is None
    assert result['arrival_explanation']['status'] == reason_status
    assert message in result['arrival_explanation']['summary'] and 'Kandra' in result['arrival_explanation']['summary']


def test_not_started_does_not_reuse_populated_actual_fields():
    data = journey(); data['status'] = 'not-started'
    assert eta_response(data, NOW)['remaining_stations'][0]['actual_arrival'] is None
    assert status_response(data, NOW)['route'][0]['arrival_confirmed'] is False


def test_documented_skipped_station_exception_is_scoped_to_correct_visit():
    data = journey()
    data['route'][2].update(stationCode='KND', stationName='Kandra')
    data['exceptions'] = [{'type': 'DIVERTED', 'diverted': {
        'skippedStations': [{'code': 'KND', 'scheduledSequence': 2}]}}]
    first, second = eta_response(data, NOW)['remaining_stations'][1:]
    assert first['predicted_arrival'] is None and first['arrival_explanation']['status'] == 'skipped'
    assert second['predicted_arrival'] is not None and second['arrival_explanation']['status'] == 'delayed'
    assert [first['route_sequence'], second['route_sequence']] == [2, 3]
    assert status_response(data, NOW)['route'][1]['stop_status'] == 'skipped'


def test_route_order_adjustment_explains_earlier_stop_without_invented_recovery(monkeypatch):
    data = journey(); data['route'][2]['scheduledArrival'] = '2026-10-16T11:01:00Z'
    monkeypatch.setattr(eta_ml, 'predict', lambda *args: ({
        1: {'arrival': datetime(2026,10,16,11,30,tzinfo=timezone.utc), 'delay': 30},
    }, {'name': 'test-model', 'status': 'validated_pilot'}))
    result = eta_response(data, NOW)['remaining_stations'][2]
    assert result['predicted_delay_minutes'] == 29
    assert result['prediction_method'] == 'delay_adjusted'
    assert 'reach Kandra first' in ' '.join(result['arrival_explanation']['details'])
    assert 'make up' not in ' '.join(result['arrival_explanation']['details'])


def test_overnight_arrival_keeps_ist_calendar_day():
    data = journey(); data['route'][1]['scheduledArrival'] = '2026-10-16T18:30:00Z'
    assert '17 Oct, 12:12 AM IST' in eta_response(data, NOW)['remaining_stations'][1]['arrival_explanation']['summary']


def test_no_confirmation_when_actuals_conflict_or_belong_after_observation():
    data = journey()
    data['route'][0]['actualArrival'] = '2026-10-16T10:01:00Z'
    assert status_response(data, NOW)['route'][0]['arrival_confirmed'] is False
    data['route'][0]['actualArrival'] = '2026-10-16T09:55:00Z'
    data['route'][0]['actualDeparture'] = '2026-10-16T09:54:00Z'
    result = status_response(data, NOW)['route'][0]
    assert result['actual_arrival'] is None and result['actual_departure'] is None


def test_actuals_ahead_of_an_unambiguous_current_station_do_not_become_arrived():
    data = journey()
    data['route'][2].update(status='departed', actualArrival='2026-10-16T09:50:00Z', actualDeparture='2026-10-16T09:55:00Z')
    status = status_response(data, NOW)['route'][2]
    result = eta_response(data, NOW)['remaining_stations'][2]
    assert status['arrival_confirmed'] is False and status['departure_confirmed'] is False
    assert result['actual_arrival'] is None and result['arrival_explanation']['status'] != 'arrived'


@pytest.mark.parametrize('change', [
    lambda d: d['currentLocation'].update(status='arrived'),
    lambda d: d['route'][0].update(isHalt=False),
    lambda d: d['route'][0].pop('isHalt'),
])
def test_stopped_duration_requires_a_confirmed_departure_from_a_halting_stop(change):
    data = journey(); data['route'][0]['actualArrival'] = '2026-10-16T09:40:00Z'; change(data)
    details = eta_response(data, NOW)['remaining_stations'][1]['arrival_explanation']['details']
    assert not any('stopped for' in detail for detail in details)


def test_conflicting_learned_outputs_do_not_attribute_order_adjustment_to_learning(monkeypatch):
    data = journey(); data['route'][2]['scheduledArrival'] = '2026-10-16T11:01:00Z'
    monkeypatch.setattr(eta_ml, 'predict', lambda *args: ({
        1: {'arrival': datetime(2026,10,16,11,30,tzinfo=timezone.utc), 'delay': 30},
        2: {'arrival': datetime(2026,10,16,11,15,tzinfo=timezone.utc), 'delay': 14},
    }, {'name': 'test-model', 'status': 'validated_pilot'}))
    result = eta_response(data, NOW)['remaining_stations'][2]
    assert result['prediction_method'] == 'inference' and result['predicted_delay_minutes'] == 29
    details = ' '.join(result['arrival_explanation']['details'])
    assert 'reach Kandra first' in details and 'make up about' not in details and 'take about' not in details


@pytest.mark.parametrize('sequences', [(2,2),(None,None)])
def test_ambiguous_skipped_visit_is_unavailable_instead_of_an_invented_cancellation(sequences):
    data = journey()
    data['route'][1]['sequence'], data['route'][2]['sequence'] = sequences
    data['route'][2].update(stationCode='KND', stationName='Kandra')
    data['exceptions'] = [{'type':'DIVERTED','diverted':{'skippedStations':[{'code':'KND','scheduledSequence':2}]}}]
    for result in eta_response(data, NOW)['remaining_stations'][1:]:
        assert result['predicted_arrival'] is None and result['arrival_explanation']['status'] == 'unavailable'
        assert 'does not clearly identify' in result['arrival_explanation']['summary']
