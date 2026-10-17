"""Scoped, fail-open inference from a trained JSON gradient-boosted tree model.

Only data is deserialized. Production needs neither pickle nor scikit-learn.
The fitting and chronological evaluation live in intelligence/train_eta/training.
"""
from datetime import datetime, timedelta, timezone
from functools import lru_cache
import json
import math
from pathlib import Path
import struct

from config.settings import settings
from services.eta_features import FEATURE_VERSION, evaluate_trees, features, finite, known_events, live_events, minutes, stamp


@lru_cache(maxsize=2)
def _read_artifact(path, modified):
    artifact=json.loads(Path(path).read_text(encoding='utf-8'))
    if (artifact.get('schema_version') != 1 or artifact.get('feature_version') != FEATURE_VERSION
            or artifact.get('promotion_passed') is not True or artifact.get('serving_policy_passed') is not True
            or artifact.get('status') != 'validated_pilot'):
        raise ValueError('Model has not passed evaluation.')
    if not isinstance(artifact['name'],str) or not stamp(artifact['training_cutoff']) or not isinstance(artifact['validation'],dict):
        raise ValueError('Invalid model provenance.')
    scope=artifact['scope']
    if not stamp(scope['evaluation_end']) or not isinstance(scope['ranges'],dict) or not isinstance(scope['pairs'],list):
        raise ValueError('Invalid model scope.')
    if (not isinstance(scope['trains'],list) or not scope['trains'] or not all(isinstance(t,str) for t in scope['trains'])
            or not isinstance(scope['allowed_horizons'],list)
            or type(scope['max_landmark_age_minutes']) is not int or not 1 <= scope['max_landmark_age_minutes'] <= 15
            or type(scope['max_evaluation_age_days']) is not int or not 1 <= scope['max_evaluation_age_days'] <= 365
            or any(not isinstance(p,list) or len(p)!=3 or not all(isinstance(v,str) for v in p) for p in scope['pairs'])):
        raise ValueError('Invalid coverage limits.')
    for limits in scope['ranges'].values():
        if not isinstance(limits,list) or len(limits)!=2 or not all(math.isfinite(v) for v in limits) or limits[0]>limits[1]:
            raise ValueError('Invalid feature range.')
    if any(not math.isfinite(artifact['validation'][key]) or artifact['validation'][key]<0
           for key in ('mae_minutes','baseline_mae_minutes','rmse_minutes')):
        raise ValueError('Invalid evaluation metrics.')
    model=artifact['model']; names=model['feature_names']
    if not names or len(names)>2000 or not 1 <= len(model['trees']) <= 500:
        raise ValueError('Invalid model dimensions.')
    if not all(isinstance(n,str) for n in names) or not all(math.isfinite(model[k]) for k in ('intercept','learning_rate')):
        raise ValueError('Invalid model features.')
    for tree in model['trees']:
        size=len(tree['left'])
        if not 1 <= size <= 2048 or any(len(tree[k]) != size for k in ('right','feature','threshold','value')):
            raise ValueError('Invalid tree dimensions.')
        for i,(left,right,feature,threshold,value) in enumerate(zip(*(tree[k] for k in ('left','right','feature','threshold','value')))):
            if not math.isfinite(threshold) or not math.isfinite(value): raise ValueError('Nonfinite tree.')
            if left == right == -1: continue
            if not (type(left) is int and type(right) is int and i < left < size and i < right < size
                    and type(feature) is int and 0 <= feature < len(names)):
                raise ValueError('Invalid tree traversal.')
    # Compile a small lookup once, outside individual prediction loops.
    artifact['_pairs']={tuple(pair) for pair in artifact['scope']['pairs']}
    return artifact


def load_artifact():
    if not settings.ETA_ML_ENABLED:
        return None
    path=Path(settings.ETA_MODEL_PATH)
    if not path.is_absolute(): path=Path(__file__).resolve().parents[1]/path
    try:
        info=path.stat()
        if info.st_size > 5_000_000: return None
        return _read_artifact(str(path),info.st_mtime_ns)
    except (OSError,ValueError,KeyError,TypeError,OverflowError,IndexError,AttributeError,RecursionError):
        return None


def horizon_name(value):
    for high,name in [(60,'under_1h'),(180,'1_to_3h'),(360,'3_to_6h'),(1440,'6_to_24h')]:
        if 0 < value <= high: return name
    return None


def model_information():
    """Public, credential-free diagnostics; does not contact railway providers."""
    artifact=load_artifact()
    if artifact is None:
        return {'status':'unavailable','enabled':settings.ETA_ML_ENABLED,
                'reason':'No qualified model artifact is available. Passenger estimates retain their explicit fallback.'}
    scope=artifact['scope']
    expired=datetime.now(timezone.utc)-stamp(scope['evaluation_end']) > timedelta(days=scope['max_evaluation_age_days'])
    return {'status':'needs_revalidation' if expired else 'validated_pilot','enabled':True,
            'name':artifact['name'],'trained_at':artifact.get('trained_at'),
            'training_cutoff':artifact['training_cutoff'],'evaluation_end':scope['evaluation_end'],
            'validation':artifact['validation'],'trains':scope['trains'],
            'forecast_horizons':scope['allowed_horizons'],'max_station_event_age_minutes':scope['max_landmark_age_minutes'],
            'limitations':['Three-train station-landmark pilot; unsupported observations use the reported-delay baseline.',
                           'Historical third-party replay; prospective RailRadar validation is still needed.',
                           'Weather, GPS speed and operational congestion are not trained inputs.']}


def predict(data, now=None):
    """Return route-indexed model forecasts and explicit fallback/model metadata.

    Recent *confirmed station events* are the available landmark. A moving GPS
    estimate is not silently substituted for station-based training inputs.
    """
    now=now or datetime.now(timezone.utc)
    metadata={'status':'fallback','reason':'A qualified trained model is unavailable. Using the observed-delay baseline where possible.'}
    artifact=load_artifact()
    if artifact is None: return {},metadata
    metadata.update(name=artifact['name'],training_cutoff=artifact['training_cutoff'],validation=artifact['validation'])
    def fallback(reason):
        metadata['reason']=reason
        return {},metadata
    try:
        observed=stamp(data.get('lastUpdatedAt'))
        state=str(data.get('status','')).lower().replace('_','-')
        if (data.get('_railradar_stale') or data.get('isLive') is not True or not observed
                or not timedelta(0) <= now-observed <= timedelta(minutes=5)
                or state in {'not-started','cancelled','canceled','completed','terminated'}):
            return fallback('A fresh observation of a running journey is required for model prediction.')
        scope=artifact['scope']; train=str(data.get('trainNumber'))
        exceptions=data.get('exceptions') or []
        if ((data.get('currentLocation') or {}).get('isDiverted') is True
                or any(isinstance(event,dict) and str(event.get('type','')).upper() in
                       {'DIVERTED','PARTIALLY_CANCELLED','RESCHEDULED','CANCELLED'} for event in exceptions)):
            return fallback('A reported journey exception changes the normal operating plan. This model has not been validated for that condition.')
        if train not in scope['trains']:
            return fallback('This train is outside the current three-train prediction pilot. Its ETA uses the reported running delay.')
        evaluated=stamp(scope['evaluation_end'])
        if not evaluated or now-evaluated > timedelta(days=scope['max_evaluation_age_days']):
            return fallback('The trained model needs evaluation on newer journeys before it can be used.')
        events=live_events(data,observed)
        sequences=[e['sequence'] for e in events]
        if any(type(s) is not int for s in sequences) or sequences != sorted(set(sequences)):
            return fallback('A verified ordered route is required for the station-based model.')
        landmarks=known_events(events,observed)
        if not landmarks: return fallback('No confirmed recent station arrival or departure is available for model prediction.')
        actual,current,kind,delay=landmarks[-1]
        if minutes(observed,actual) > scope['max_landmark_age_minutes']:
            return fallback('The latest confirmed station event is too old for this trained model. The reported-delay estimate remains available.')
        location=data.get('currentLocation') or {}
        if location.get('stationCode') and location['stationCode'] != events[current]['station_code']:
            return fallback('The reported location no longer matches the confirmed station event required by this model.')
        reported_delay=finite(data.get('delayMinutes'))
        if reported_delay is None or abs(reported_delay-delay) > 5:
            return fallback('Station timestamps and reported running delay disagree; model prediction has been withheld.')
        results={}
        for target,event in enumerate(events):
            row=data['route'][target]
            if target <= current or row.get('status') != 'upcoming' or row.get('actualArrival'): continue
            if (train,events[current]['station_code'],event['station_code']) not in artifact['_pairs']: continue
            values=features(train,data.get('startDate'),events,current,target,observed,kind)
            if values is None or horizon_name(values['scheduled_horizon_minutes']) not in scope['allowed_horizons']: continue
            if any(not limits[0] <= values[key] <= limits[1] for key,limits in scope['ranges'].items()): continue
            predicted_delay=delay+evaluate_trees(artifact['model'],values)
            scheduled=stamp(event['scheduled_arrival'])
            estimate=scheduled+timedelta(minutes=predicted_delay)
            if not math.isfinite(predicted_delay) or not -120 <= predicted_delay <= 1440 or estimate <= now: continue
            results[target]={'arrival':estimate,'delay':predicted_delay}
        if not results: return fallback('No upcoming stop meets this model’s trained route, feature and forecast-horizon coverage.')
        metadata.update(status='validated_pilot',reason='Trained on past station events for three trains; evaluated on later journeys. This is a limited pilot, with prospective RailRadar validation still needed.')
        return results,metadata
    except (ValueError,TypeError,KeyError,OverflowError,IndexError,AttributeError,struct.error):
        return fallback('model inputs could not be verified. The observed-delay estimate remains available where supported.')
