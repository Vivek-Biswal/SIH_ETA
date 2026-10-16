from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json

import pytest

from services import eta_ml, railradar_passenger
from services.eta_features import features, known_events, stamp, evaluate_trees

NOW=datetime(2026,10,15,10,1,tzinfo=timezone.utc)


def observation():
    return {'trainNumber':'12423','trainName':'Test service','startDate':'2026-10-15','status':'running',
      'isLive':True,'lastUpdatedAt':'2026-10-15T10:00:00Z','delayMinutes':12,
      'currentLocation':{'stationCode':'AAA','sequence':1},'route':[
        {'stationCode':'AAA','sequence':1,'status':'departed','distance':0,
         'scheduledArrival':'2026-10-15T09:45:00Z','actualArrival':'2026-10-15T09:57:00Z',
         'scheduledDeparture':'2026-10-15T09:48:00Z','actualDeparture':'2026-10-15T10:00:00Z'},
        {'stationCode':'BBB','sequence':2,'status':'upcoming','distance':60,
         'scheduledArrival':'2026-10-15T10:48:00Z','scheduledDeparture':'2026-10-15T10:50:00Z'}]}


def artifact():
    # A deliberately tiny test tree, not a production training artifact.
    return {'schema_version':1,'feature_version':'station-landmark-v1','promotion_passed':True,'serving_policy_passed':True,
       'status':'validated_pilot','name':'test-model','training_cutoff':'2026-01-01T00:00:00Z',
       'validation':{'mae_minutes':5,'baseline_mae_minutes':8,'rmse_minutes':9,'test_journeys':20},
       'scope':{'trains':['12423'],'pairs':[['12423','AAA','BBB']], 'ranges':{},
                'allowed_horizons':['under_1h'],'max_landmark_age_minutes':15,
                'evaluation_end':'2026-09-01T00:00:00Z','max_evaluation_age_days':180},
       'model':{'feature_names':['current_delay'],'intercept':0,'learning_rate':1,
                'trees':[{'left':[-1],'right':[-1],'feature':[-2],'threshold':[-2],'value':[-4]}]}}


@pytest.fixture
def model(tmp_path,monkeypatch):
    target=tmp_path/'model.json'; target.write_text(json.dumps(artifact()),encoding='utf-8')
    monkeypatch.setattr(eta_ml.settings,'ETA_MODEL_PATH',str(target))
    monkeypatch.setattr(eta_ml.settings,'ETA_ML_ENABLED',True)
    eta_ml._read_artifact.cache_clear()
    yield target
    eta_ml._read_artifact.cache_clear()


def test_portable_tree_uses_feature_splits_and_categorical_encoding():
    tree={'feature_names':['train=12423','current_delay'],'intercept':2,'learning_rate':.5,
          'trees':[{'left':[1,-1,-1],'right':[2,-1,-1],'feature':[1,-2,-2],
                    'threshold':[10,-2,-2],'value':[0,-4,8]}]}
    assert evaluate_trees(tree,{'train':'12423','current_delay':5}) == 0
    assert evaluate_trees(tree,{'train':'12423','current_delay':20}) == 6


def test_scoped_model_changes_eta_and_preserves_contract(model):
    result=railradar_passenger.eta_response(observation(),NOW)
    assert result['prediction_method']=='inference'
    assert result['model_metadata']['status']=='validated_pilot'
    stop=result['remaining_stations'][1]
    assert stop['prediction_method']=='inference'
    assert stop['predicted_arrival']=='2026-10-15T10:56:00+00:00'
    assert stop['predicted_delay_minutes']==8
    assert result['delay_factors']==[] and result['confidence_score'] is None


def test_model_diagnostics_do_not_contact_railway_provider(model,monkeypatch):
    import httpx
    from fastapi.testclient import TestClient
    from main import app
    def unexpected(*args,**kwargs):raise AssertionError('Diagnostics must not use a provider request')
    monkeypatch.setattr(httpx,'get',unexpected)
    response=TestClient(app).get('/api/v1/eta/model')
    assert response.status_code==200
    assert response.json()['trains']==['12423']
    assert 'model' not in response.json()


def test_packaged_artifact_is_qualified_and_matches_recorded_evaluation(monkeypatch):
    from pathlib import Path
    target=Path(__file__).resolve().parents[2]/'data/eta_ml/model.json'
    monkeypatch.setattr(eta_ml.settings,'ETA_MODEL_PATH',str(target))
    monkeypatch.setattr(eta_ml.settings,'ETA_ML_ENABLED',True)
    eta_ml._read_artifact.cache_clear()
    loaded=eta_ml.load_artifact()
    assert loaded is not None and loaded['promotion_passed'] and loaded['serving_policy_passed']
    report=json.loads((target.parent/'evaluation.json').read_text())
    assert loaded['validation']['test_journeys']==report['evaluation']['test']['journeys']
    assert loaded['validation']['mae_minutes']==report['serving_policy_evaluation']['test']['model_with_fallback']['mae_minutes']
    assert loaded['validation']['mae_minutes'] < loaded['validation']['baseline_mae_minutes']
    assert report['portable_max_absolute_difference'] < 1e-5
    data=observation(); data['trainNumber']='12303'
    data['currentLocation']['stationCode']='ARA'
    data['route'][0]['stationCode']='ARA'; data['route'][1]['stationCode']='BXR'
    response=railradar_passenger.eta_response(data,NOW)
    assert response['prediction_method']=='inference'
    assert response['model_version']=='eta-gbr-landmark-v1'
    assert response['remaining_stations'][1]['predicted_arrival'] is not None


@pytest.mark.parametrize('change',[
    lambda d:d.update(trainNumber='99999'),
    lambda d:d.update(lastUpdatedAt='2026-10-15T09:00:00Z'),
    lambda d:d.update(status='not-started'),
    lambda d:d.update(_railradar_stale=True),
    lambda d:d.update(delayMinutes=35),
    lambda d:d['route'][0].update(status='upcoming'),
    lambda d:d['route'][1].update(stationCode='UNKNOWN'),
    lambda d:d['route'][1].update(sequence=1),
    lambda d:d['currentLocation'].update(stationCode='OTHER'),
    lambda d:d.update(exceptions=[{'type':'DIVERTED'}]),
    lambda d:d['currentLocation'].update(isDiverted=True),
])
def test_unsupported_or_unverified_observations_fall_back(model,change):
    data=observation(); change(data)
    predictions,metadata=eta_ml.predict(data,NOW)
    assert not predictions and metadata['status']=='fallback'


def test_missing_corrupt_cyclic_or_unqualified_model_is_safe(model):
    for payload in ['broken','{}','null','[]','1',json.dumps({**artifact(),'promotion_passed':False})]:
        model.write_text(payload); eta_ml._read_artifact.cache_clear()
        assert eta_ml.load_artifact() is None
        assert railradar_passenger.eta_response(observation(),NOW)['prediction_method']=='delay_adjusted'
    invalid=artifact(); invalid['model']['trees'][0]['left'][0]=0
    model.write_text(json.dumps(invalid)); eta_ml._read_artifact.cache_clear()
    assert eta_ml.load_artifact() is None
    model.unlink()
    assert eta_ml.load_artifact() is None


def test_feature_ranges_stale_evaluation_and_old_station_event_withhold_model(model):
    for change in [lambda a:a['scope']['ranges'].update(current_delay=[0,5]),
                   lambda a:a['scope'].update(evaluation_end='2020-01-01T00:00:00Z')]:
        data=artifact();change(data);model.write_text(json.dumps(data));eta_ml._read_artifact.cache_clear()
        assert not eta_ml.predict(observation(),NOW)[0]
    data=observation();data['route'][0]['actualDeparture']='2026-10-15T09:35:00Z'
    model.write_text(json.dumps(artifact()));eta_ml._read_artifact.cache_clear()
    assert not eta_ml.predict(data,NOW)[0]


def test_future_arrivals_and_departures_do_not_leak_into_features():
    observed=stamp('2026-10-15T10:00:00Z')
    data=observation(); events=eta_ml.live_events(data,observed)
    original=features('12423','2026-10-15',events,0,1,observed,'arrival')
    # Later departure and target outcomes are not known at the arrival landmark.
    changed=deepcopy(events)
    changed[0]['actual_departure']='2026-10-15T10:30:00Z'
    changed[1].update(actual_arrival='2026-10-15T11:30:00Z',arrival_confirmed=True,
                      actual_departure='2026-10-15T11:35:00Z',departure_confirmed=True)
    assert features('12423','2026-10-15',changed,0,1,observed,'arrival')==original
    assert len(known_events(changed,observed))==1


def test_overnight_horizon_uses_dated_times_and_unknown_distance_has_own_flag():
    data=observation(); events=eta_ml.live_events(data,NOW)
    events[0].update(scheduled_departure='2026-10-15T23:50:00+05:30',
                     actual_departure='2026-10-16T00:02:00+05:30',distance_km=None)
    events[1]['scheduled_arrival']='2026-10-16T00:50:00+05:30'
    result=features('12423','2026-10-15',events,0,1,stamp('2026-10-16T00:02:00+05:30'),'departure')
    assert result['scheduled_horizon_minutes']==60 and result['current_delay']==12
    assert result['distance_known']==0 and result['distance_remaining_km']==0
