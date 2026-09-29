from datetime import datetime, timezone
from services import weather_service as weather
from services.railradar_passenger import eta_response

NOW = datetime(2026, 9, 29, 12, tzinfo=timezone.utc)
def journey():
    return {'trainNumber':'12301','trainName':'Test','startDate':'2026-09-29', 'isLive':True,
            'lastUpdatedAt':NOW.isoformat(),'delayMinutes':10,'status':'running',
            'route':[{'stationCode':'AAA','stationName':'Station','latitude':20,'longitude':80,
                      'status':'upcoming','scheduledArrival':'2026-09-29T13:00:00Z'}]}

def test_not_started_never_has_a_live_eta():
    data = journey(); data['status'] = 'not-started'
    result = eta_response(data, NOW)
    assert result['prediction_method'] == 'schedule_only'
    assert result['remaining_stations'][0]['predicted_arrival'] is None
    assert 'not started' in result['explanation']

def test_forecast_matches_arrival_without_inventing_weather_delay(monkeypatch):
    monkeypatch.setattr(weather.settings,'WEATHER_API_KEY','test')
    # Keep the fixture timestamp explicit and independent of local timezone.
    stamp = datetime(2026,9,29,12,tzinfo=timezone.utc).timestamp()
    monkeypatch.setattr(weather,'forecast',lambda *args: {'retrieved_at':NOW.isoformat(),'rows':[{'dt':stamp,'main':{'temp':28},'wind':{'speed':5},'rain':{'3h':8},'weather':[{'description':'rain'}]}]})
    result = weather.weather_for_journey(journey(),'AAA',NOW)
    assert result['available'] and result['wind_kmh'] == 18
    assert result['weather_delay_minutes'] is None
    assert result['arrival_basis'] == 'estimated'

def test_unavailable_forecast_and_duplicate_stop_are_explicit(monkeypatch):
    monkeypatch.setattr(weather.settings,'WEATHER_API_KEY','test')
    monkeypatch.setattr(weather,'forecast',lambda *args: None)
    assert not weather.weather_for_journey(journey(),'AAA',NOW)['available']
    data=journey(); data['route'] *= 2
    assert 'unique' in weather.weather_for_journey(data,'AAA',NOW)['message']

def test_cache_reuses_forecast(monkeypatch):
    weather._cache.clear()
    calls=[]
    class Response:
        def raise_for_status(self): pass
        def json(self): return {'list':[{'dt':1}]}
    monkeypatch.setattr(weather.httpx,'get',lambda *a,**kw: calls.append(1) or Response())
    assert weather.forecast(20,80) == weather.forecast(20,80)
    assert len(calls) == 1

def test_provider_failure_is_cached_without_exposing_key(monkeypatch):
    weather._cache.clear()
    calls=[]
    def fail(*args, **kwargs):
        calls.append(1)
        raise weather.httpx.ConnectError('credential must never reach response')
    monkeypatch.setattr(weather.httpx,'get',fail)
    assert weather.forecast(20,80) is None
    assert weather.forecast(20,80) is None
    assert len(calls) == 1

def test_out_of_horizon_makes_no_weather_request(monkeypatch):
    data=journey(); data['route'][0]['scheduledArrival']='2026-10-10T13:00:00Z'
    monkeypatch.setattr(weather,'forecast',lambda *args: (_ for _ in ()).throw(AssertionError('Must not call provider')))
    assert not weather.weather_for_journey(data,'AAA',NOW)['available']
