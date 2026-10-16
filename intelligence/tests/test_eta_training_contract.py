"""Fast causal/split checks; fixtures here are synthetic, training data is not."""
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('eta_train',ROOT/'intelligence/train_eta/training/train.py')
training=importlib.util.module_from_spec(spec);spec.loader.exec_module(training)


def test_whole_journey_chronology_with_embargo_and_label_purge():
    samples=[]
    start=datetime(2025,1,1,tzinfo=timezone.utc)
    for day in range(200):
        when=start+timedelta(days=day)
        for train in ['12303','12423']:
            for horizon in [1,2]:
                samples.append({'day':when.date().isoformat(),'journey':train+'/'+when.date().isoformat(),
                                'asof':when.isoformat(),'label_at':(when+timedelta(hours=horizon)).isoformat()})
    groups=training.temporal_split(samples)
    previous=set()
    for name,rows in groups.items():
        journeys={r['journey'] for r in rows}
        assert not previous & journeys
        previous.update(journeys)
        assert all(sum(r['journey']==j for r in rows)==2 for j in journeys)
    for left,right in [('train','validation'),('validation','calibration'),('calibration','test')]:
        assert max(r['label_at'] for r in groups[left]) < min(r['asof'] for r in groups[right])
        assert (datetime.fromisoformat(min(r['day'] for r in groups[right]))-
                datetime.fromisoformat(max(r['day'] for r in groups[left]))).days >= 4


def test_target_outcome_and_future_departure_are_not_input_features(tmp_path):
    rows=[{'train_number':'12423','journey_date':'2025-01-01','station_code':'AAA','sequence':1,
           'actual_arrival':'2025-01-01T10:10:00+05:30','scheduled_arrival':'2025-01-01T10:00:00+05:30',
           'actual_departure':'2025-01-01T10:40:00+05:30','scheduled_departure':'2025-01-01T10:05:00+05:30',
           'arrival_confirmed':True,'departure_confirmed':True,'reported_at':'2025-01-01T10:10:00+05:30'},
          {'train_number':'12423','journey_date':'2025-01-01','station_code':'BBB','sequence':2,
           'actual_arrival':'2025-01-01T12:15:00+05:30','scheduled_arrival':'2025-01-01T12:00:00+05:30',
           'arrival_confirmed':True,'departure_confirmed':False,'reported_at':'2025-01-01T12:15:00+05:30'}]
    path=tmp_path/'events.jsonl'
    path.write_text('\n'.join(json.dumps(r) for r in rows),encoding='utf-8')
    before,_=training.build_samples(path)
    rows[0]['actual_departure']='2025-01-01T11:00:00+05:30'
    rows[1]['actual_arrival']='2025-01-01T13:00:00+05:30'
    rows[1]['reported_at']='2025-01-01T13:00:00+05:30'
    path.write_text('\n'.join(json.dumps(r) for r in rows),encoding='utf-8')
    after,_=training.build_samples(path)
    arrival_before=next(r for r in before if r['features']['landmark']=='arrival')
    arrival_after=next(r for r in after if r['features']['landmark']=='arrival')
    assert arrival_before['features']==arrival_after['features']
    assert arrival_before['target'] != arrival_after['target']
    assert arrival_before['features']['observed_dwell_minutes']==0
