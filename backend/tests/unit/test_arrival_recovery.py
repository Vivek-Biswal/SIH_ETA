"""Observed recovery and possible future recovery must never be conflated."""
from datetime import datetime, timedelta, timezone

import pytest

from services import eta_ml
from services.railradar_passenger import eta_response

NOW = datetime(2026,10,16,10,1,tzinfo=timezone.utc)


def journey(before=12, current=8):
    def row(code, sequence, minute, delay, name):
        scheduled = NOW+timedelta(minutes=minute)
        actual = scheduled+timedelta(minutes=delay)
        return {'stationCode':code,'stationName':name,'sequence':sequence,'isHalt':True,'status':'departed',
                'scheduledArrival':(scheduled-timedelta(minutes=5)).isoformat(),
                'scheduledDeparture':scheduled.isoformat(),
                'actualArrival':(actual-timedelta(minutes=5)).isoformat(),'actualDeparture':actual.isoformat()}
    return {'trainNumber':'18102','trainName':'Test train','startDate':'2026-10-16','status':'running',
            'isLive':True,'lastUpdatedAt':(NOW-timedelta(minutes=1)).isoformat(),'delayMinutes':current,
            'currentLocation':{'stationCode':'UMB','sequence':2,'status':'departed'},
            'route':[row('PNP',1,-90,before,'Panipat'),row('UMB',2,-35,current,'Ambala'),
                     {'stationCode':'LLU','stationName':'Lalru','sequence':3,'status':'upcoming',
                      'scheduledArrival':(NOW+timedelta(minutes=60)).isoformat()},
                     {'stationCode':'KLK','stationName':'Kalka','sequence':4,'status':'upcoming',
                      'scheduledArrival':(NOW+timedelta(minutes=120)).isoformat()}]}


def explanation(data):
    return eta_response(data,NOW)['remaining_stations'][2]['arrival_explanation']


@pytest.mark.parametrize(('before','current','recovered'), [(12,8,4),(12,-2,12),(-4,-8,0),(8,12,0),(8,8,0)])
def test_observed_recovery_counts_only_lateness_already_removed(before,current,recovered):
    reason = explanation(journey(before,current))
    assert reason['timing']['current_delay_minutes'] == current
    assert reason['timing']['recovered_minutes'] == recovered
    assert reason['timing']['recovery_from_station'] == 'Panipat'
    assert reason['timing']['recovery_to_station'] == 'Ambala'
    assert reason['timing']['expected_recovery_minutes'] is None
    assert reason['timing']['future_recovery_status'] == 'not_estimated'
    assert 'Future recovery before Lalru cannot yet be estimated' in ' '.join(reason['details'])
    if recovered:
        assert f'already recovered {recovered} minutes since Panipat' in ' '.join(reason['details'])


def test_already_recovered_and_possible_recovery_are_separate_and_station_specific(monkeypatch):
    data=journey(12,8)
    monkeypatch.setattr(eta_ml,'predict',lambda *_: ({
        2:{'arrival':NOW+timedelta(minutes=65)},3:{'arrival':NOW+timedelta(minutes=130)}},{}))
    first,last=eta_response(data,NOW)['remaining_stations'][2:]
    a,b=first['arrival_explanation']['timing'],last['arrival_explanation']['timing']
    assert a['recovered_minutes'] == b['recovered_minutes'] == 4
    assert a['expected_recovery_minutes'] == 3 and a['expected_additional_delay_minutes'] == 0
    assert b['expected_recovery_minutes'] == 0 and b['expected_additional_delay_minutes'] == 2
    assert 'make up about 3 minutes before reaching Lalru' in ' '.join(first['arrival_explanation']['details'])
    assert 'take about 2 minutes longer' in ' '.join(last['arrival_explanation']['details'])


def test_future_recovery_is_capped_at_current_lateness_even_when_predicted_early(monkeypatch):
    monkeypatch.setattr(eta_ml,'predict',lambda *_: ({2:{'arrival':NOW+timedelta(minutes=55)}},{}))
    reason=explanation(journey(12,8))
    assert reason['status'] == 'early'
    assert reason['timing']['expected_recovery_minutes'] == 8
    assert 'make up about 8 minutes' in ' '.join(reason['details'])


@pytest.mark.parametrize('change',[
    lambda d:d['route'][0].update(actualArrival=None,actualDeparture=None),
    lambda d:d['route'][0].update(actualDeparture='2026-10-16T12:00:00Z',actualArrival=None),
    lambda d:d['route'][0].update(sequence=2),
    lambda d:d['currentLocation'].update(sequence=99),
    lambda d:d['route'][1].update(actualArrival='2026-10-16T09:01:00Z',actualDeparture='2026-10-16T09:02:00Z'),
    lambda d:d['route'][0].update(status='skipped'),
])
def test_missing_conflicting_future_or_ambiguous_timings_do_not_invent_recovery(change):
    data=journey();data['route'][1]['actualArrival']=None;change(data)
    assert explanation(data)['timing']['recovered_minutes'] is None


def test_recovery_can_be_measured_within_one_confirmed_completed_halt():
    data=journey();data['route'][0].update(actualArrival=None,actualDeparture=None)
    # Arrival12minlate, departure8minlate: a shorter halt recovered4min.
    row=data['route'][1]
    row['actualArrival']=(datetime.fromisoformat(row['scheduledArrival'])+timedelta(minutes=12)).isoformat()
    row['actualDeparture']=(datetime.fromisoformat(row['scheduledDeparture'])+timedelta(minutes=8)).isoformat()
    reason=explanation(data)
    assert reason['timing']['recovered_minutes'] == 4
    assert 'during the stop at Ambala' in ' '.join(reason['details'])


def test_long_halt_can_explain_added_lateness_without_inventing_signal_or_platform_causes():
    data=journey(8,12);row=data['route'][1]
    row['actualArrival']=(datetime.fromisoformat(row['scheduledArrival'])+timedelta(minutes=8)).isoformat()
    reason=explanation(data);text=' '.join(reason['details'])
    assert 'stopped for 9 minutes instead of the planned 5 minutes, adding 4 minutes' in text
    assert 'lost 4 minutes since Panipat' in text
    assert 'signal' not in text and 'platform' not in text


def test_early_arrival_waiting_for_schedule_is_not_described_as_delay_cause():
    data=journey(8,0);row=data['route'][1]
    row['actualArrival']=(datetime.fromisoformat(row['scheduledArrival'])-timedelta(minutes=10)).isoformat()
    text=' '.join(explanation(data)['details'])
    assert 'longer stop' not in text and 'adding' not in text and 'stopped for' not in text


def test_ongoing_stop_is_an_asof_duration_and_only_a_possible_contributor():
    data=journey(12,8);row=data['route'][1]
    row['actualDeparture']=None;row['status']='arrived';data['currentLocation']['status']='arrived'
    reason=explanation(data);text=' '.join(reason['details'])
    assert 'at least' in text and 'may be adding to the delay' in text
    assert 'stopped for' not in text


def test_a_slower_confirmed_section_is_observed_without_guessing_why():
    text=' '.join(explanation(journey(8,12))['details'])
    assert 'journey from Panipat to Ambala took 4 minutes longer than scheduled' in text
    assert 'cause of the slower journey was not reported' in text


def test_route_order_clamp_does_not_become_an_estimated_recovery(monkeypatch):
    data=journey();data['route'][3]['scheduledArrival']=(NOW+timedelta(minutes=61)).isoformat()
    monkeypatch.setattr(eta_ml,'predict',lambda *_: ({
        2:{'arrival':NOW+timedelta(minutes=90)},3:{'arrival':NOW+timedelta(minutes=62)}},{}))
    reason=eta_response(data,NOW)['remaining_stations'][3]['arrival_explanation']
    assert reason['timing']['future_recovery_status'] == 'route_order_adjusted'
    assert reason['timing']['expected_recovery_minutes'] is None
    assert 'make up' not in ' '.join(reason['details'])


def test_impossible_cross_station_overlap_cannot_explain_delay_or_recovery():
    data=journey(10,10)
    a,b=data['route'][:2]
    a.update(scheduledArrival='2026-10-16T09:35:00Z',scheduledDeparture='2026-10-16T09:40:00Z',
             actualArrival='2026-10-16T09:45:00Z',actualDeparture='2026-10-16T09:50:00Z')
    b.update(scheduledArrival='2026-10-16T09:45:00Z',scheduledDeparture='2026-10-16T09:50:00Z',
             actualArrival='2026-10-16T09:40:00Z',actualDeparture='2026-10-16T10:00:00Z')
    reason=explanation(data)
    assert reason['timing']['recovered_minutes'] is None
    assert 'stopped for' not in ' '.join(reason['details'])


def test_conflicting_current_report_never_attributes_lateness_to_a_completed_stop():
    data=journey(8,12);data['delayMinutes']=8
    row=data['route'][1]
    row['actualArrival']=(datetime.fromisoformat(row['scheduledArrival'])+timedelta(minutes=8)).isoformat()
    reason=explanation(data)
    assert reason['timing']['recovered_minutes'] is None
    assert 'adding' not in ' '.join(reason['details'])


def test_passing_location_can_explain_a_recent_longer_halt_with_carry_forward_label():
    data=journey(8,12);data['route'][1]['isHalt']=False
    row=data['route'][0]
    row['actualArrival']=(datetime.fromisoformat(row['scheduledArrival'])+timedelta(minutes=4)).isoformat()
    text=' '.join(explanation(data)['details'])
    assert 'last confirmed stop at Panipat took 9 minutes instead of 5 minutes, adding 4 minutes' in text
    assert 'may still be carrying forward' in text


def test_fully_recovered_earlier_long_halt_is_not_used_to_explain_a_new_delay():
    data=journey(8,12)
    row=data['route'][0]
    row['actualArrival']=(datetime.fromisoformat(row['scheduledArrival'])+timedelta(minutes=4)).isoformat()
    # Current arrival recovered all previous lateness, then a new long halt.
    current=data['route'][1]
    current['actualArrival']=current['scheduledArrival']
    text=' '.join(explanation(data)['details'])
    assert 'last confirmed stop at Panipat' not in text
    assert 'At Ambala' in text


@pytest.mark.parametrize('change',[
    lambda d:d.update(lastUpdatedAt='2026-10-16T08:00:00Z'),
    lambda d:d.update(_railradar_stale=True),
    lambda d:d.update(status='cancelled'),
    lambda d:d.update(status='not-started'),
    lambda d:d['route'][2].update(status='skipped'),
])
def test_inactive_or_stale_arrival_reasons_have_no_current_recovery_claims(change):
    data=journey();change(data)
    assert explanation(data).get('timing') is None
