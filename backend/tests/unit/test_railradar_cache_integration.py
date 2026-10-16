from datetime import datetime, timezone
import httpx
import pytest
from services import railradar_requests as requests
from services import railradar_passenger as rail
from services import eta_observations

@pytest.fixture
def cache(monkeypatch, tmp_path):
    manager = requests.RequestManager(tmp_path/'provider.sqlite3', ['fake-key'])
    monkeypatch.setattr(requests, '_manager', manager)
    return manager

def live():
    return {'trainNumber':'12301','trainName':'Test train','startDate':'2026-10-15',
            'lastUpdatedAt':'2026-10-15T10:00:00Z','isLive':True,'delayMinutes':12,'status':'running',
            'route':[{'stationCode':'AAA','stationName':'A','status':'upcoming','scheduledArrival':'2026-10-15T11:00:00Z'}]}

def test_status_then_dated_eta_uses_one_provider_request(cache,monkeypatch):
    calls=[]
    snapshots=[]
    monkeypatch.setattr(eta_observations,'record_observation',lambda data:snapshots.append(data))
    def get(*args,**kwargs):
        calls.append(kwargs)
        return httpx.Response(200,json={'success':True,'data':live()},request=httpx.Request('GET',args[0]))
    monkeypatch.setattr(requests.httpx,'get',get)
    first=rail.fetch_live('12301',None)
    second=rail.fetch_live('12301',first['startDate'])
    assert first == second and len(calls) == 1
    assert len(snapshots) == 1

def test_stale_fallback_does_not_generate_live_eta(cache,monkeypatch):
    clock=[1000.0]
    monkeypatch.setattr(requests,'time',lambda: clock[0])
    cache.remember('trains/12301/live',{'date':'2026-10-15'},live())
    clock[0] += 121
    monkeypatch.setattr(requests.httpx,'get',lambda *a,**k: httpx.Response(503,request=httpx.Request('GET',a[0])))
    data=rail.fetch_live('12301','2026-10-15')
    now=datetime(2026,10,15,10,1,tzinfo=timezone.utc)
    assert rail.status_response(data,now)['data_source'] == 'cached'
    assert rail.eta_response(data,now)['prediction_method'] == 'schedule_only'
    assert rail.eta_response(data,now)['remaining_stations'][0]['predicted_arrival'] is None

def test_search_and_paginated_timetable_reuse_cached_resource(cache,monkeypatch):
    calls=[]
    def get(url,**kwargs):
        calls.append(url)
        data=[{'number':'12301','name':'Test'}] if 'lookup' in url else {
            'from':{'code':'AAA','name':'A'},'to':{'code':'BBB','name':'B'},'trains':[]}
        return httpx.Response(200,json={'success':True,'data':data},request=httpx.Request('GET',url))
    monkeypatch.setattr(requests.httpx,'get',get)
    rail.lookup_trains('Test'); rail.lookup_trains(' test ')
    rail.between('AAA','BBB','2026-10-15',1,20)
    rail.between('AAA','BBB','2026-10-15',2,20)
    assert len(calls) == 2

def test_undated_alias_cannot_replace_a_newer_dated_observation(cache,monkeypatch):
    clock=[1000.0]
    monkeypatch.setattr(requests,'time',lambda: clock[0])
    path='trains/12301/live'
    older=live()
    cache.remember(path,{},older)
    clock[0] += 90
    newer=live(); newer['delayMinutes']=20
    cache.remember(path,{'date':'2026-10-15'},newer)
    cache.alias(path,{}, {'date':'2026-10-15'})
    assert rail.fetch_live('12301','2026-10-15')['delayMinutes'] == 20

def test_missing_journey_does_not_repeat_provider_calls(cache,monkeypatch):
    calls=[]
    def get(url,**kwargs):
        calls.append(url)
        return httpx.Response(404,request=httpx.Request('GET',url))
    monkeypatch.setattr(requests.httpx,'get',get)
    for _ in range(2):
        with pytest.raises(rail.HTTPException) as error:
            rail.fetch_live('12301','2026-10-15')
        assert error.value.status_code == 404
    assert len(calls) == 1
