"""Causal feature contract shared by historical replay and online inference."""
from datetime import datetime, timezone, timedelta
import math
import struct

FEATURE_VERSION = 'station-landmark-v1'
IST = timezone(timedelta(hours=5, minutes=30))

def evaluate_trees(model, row):
    """Portable inference matching sklearn's float32 inputs and additive trees."""
    values=[]
    for name in model['feature_names']:
        if '=' in name:
            key, category = name.split('=', 1)
            value = float(row.get(key) == category)
        else:
            value = float(row.get(name, 0))
        values.append(struct.unpack('f', struct.pack('f', value))[0])
    result=model['intercept']
    for tree in model['trees']:
        node=0
        while tree['left'][node] != -1:
            node=tree['left'][node] if values[tree['feature'][node]] <= tree['threshold'][node] else tree['right'][node]
        result += model['learning_rate']*tree['value'][node]
    return result

def stamp(value):
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return result if result.tzinfo else None
    except (ValueError, AttributeError, TypeError):
        return None

def finite(value):
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (ValueError, TypeError):
        return None

def minutes(a, b):
    return (a-b).total_seconds()/60

def known_events(events, asof):
    """Future populated actual* fields are never used as known observations."""
    result=[]
    for index, event in enumerate(events):
        for kind in ('arrival', 'departure'):
            actual, scheduled = stamp(event.get('actual_'+kind)), stamp(event.get('scheduled_'+kind))
            reported = stamp(event.get('reported_at'))
            if event.get(kind+'_confirmed') and actual and scheduled and actual <= asof and (reported is None or reported <= asof):
                result.append((actual, index, kind, minutes(actual, scheduled)))
    return sorted(result, key=lambda row: (row[0], row[1], row[2] == 'departure'))

def features(train, journey_date, events, current, target, asof, kind, current_delay=None):
    if not (0 <= current < target < len(events)):
        return None
    anchor, destination = events[current], events[target]
    actual = stamp(anchor.get('actual_'+kind))
    scheduled = stamp(anchor.get('scheduled_'+kind))
    target_scheduled = stamp(destination.get('scheduled_arrival'))
    if not actual or not scheduled or not target_scheduled or actual > asof or target_scheduled <= scheduled:
        return None
    delay = finite(current_delay) if current_delay is not None else minutes(actual, scheduled)
    if delay is None or not -120 <= delay <= 1440:
        return None
    horizon = minutes(target_scheduled, scheduled)
    # Scoped station-landmark model; new long-horizon/telemetry models can extend it.
    if not 0 < horizon <= 1440:
        return None
    history = [r for r in known_events(events[:current+1], asof) if r[0] <= actual]
    prior = [r[3] for r in history[:-1]][-3:]
    arrival = stamp(anchor.get('actual_arrival'))
    dwell = minutes(actual, arrival) if kind == 'departure' and anchor.get('arrival_confirmed') and arrival and arrival <= actual else 0
    sd, sa = stamp(destination.get('scheduled_departure')), stamp(destination.get('scheduled_arrival'))
    distance_a, distance_b = finite(anchor.get('distance_km')), finite(destination.get('distance_km'))
    local = asof.astimezone(IST)
    target_local = target_scheduled.astimezone(IST)
    return {
        'train': str(train), 'current_station': str(anchor['station_code']), 'target_station': str(destination['station_code']),
        'landmark': kind, 'current_delay': delay, 'previous_delay': prior[-1] if prior else delay,
        'delay_trend': delay-prior[-1] if prior else 0,
        'recent_mean_delay': sum(prior)/len(prior) if prior else delay,
        'scheduled_horizon_minutes': horizon,
        'observed_dwell_minutes': max(0,dwell),
        'target_scheduled_dwell': max(0,minutes(sd,sa)) if sd and sa else 0,
        'distance_known': int(distance_a is not None and distance_b is not None and distance_b >= distance_a),
        'distance_remaining_km': max(0,distance_b-distance_a) if distance_a is not None and distance_b is not None else 0,
        'weekday': local.weekday(), 'month': local.month,
        'target_hour_sin': math.sin(target_local.hour*math.tau/24), 'target_hour_cos': math.cos(target_local.hour*math.tau/24),
        'observation_hour_sin': math.sin(local.hour*math.tau/24), 'observation_hour_cos': math.cos(local.hour*math.tau/24),
    }

def live_events(data, asof):
    result=[]
    for row in data.get('route', []):
        actual_arrival = stamp(row.get('actualArrival'))
        actual_departure = stamp(row.get('actualDeparture'))
        passed = row.get('status') in ('departed','arrived','at-station','at_station','completed')
        result.append({
            'station_code': row.get('stationCode',''), 'sequence': row.get('sequence'),
            'scheduled_arrival': row.get('scheduledArrival'), 'scheduled_departure': row.get('scheduledDeparture'),
            'actual_arrival': row.get('actualArrival'), 'actual_departure': row.get('actualDeparture'),
            'arrival_confirmed': bool(passed and actual_arrival and actual_arrival <= asof),
            'departure_confirmed': bool(row.get('status') == 'departed' and actual_departure and actual_departure <= asof),
            'distance_km': row.get('distance', row.get('distanceKm')),
        })
    return result
