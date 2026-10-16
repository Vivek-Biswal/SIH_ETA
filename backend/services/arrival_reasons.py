"""Passenger explanations assembled only from this journey's reported evidence.

No extra provider calls, guessed operational causes or model-wide test scores.
"""
from datetime import timedelta, timezone
import math

from services.eta_features import stamp

IST = timezone(timedelta(hours=5, minutes=30))
RUNNING_STATES = {'running', 'in-transit', 'at-station', 'arrived', 'halted', 'stopped', 'departed', 'delayed'}
ARRIVED_STATES = {'arrived', 'departed', 'at-station', 'completed', 'halted'}
DEPARTED_STATES = {'departed', 'completed'}
MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')


def state(value):
    return str(value or '').strip().lower().replace('_', '-').replace(' ', '-')


def number(value):
    if type(value) not in (int, float) or not math.isfinite(value):
        return None
    return value


def name(row):
    return str(row.get('stationName') or row.get('stationCode') or 'this station').strip()[:256]


def confirmed_times(row, observed, now, context=None):
    """A populated actual* field alone is not proof that an event happened."""
    if not observed or observed > now:
        return None, None
    status = state(row.get('status'))
    arrival, departure = stamp(row.get('actualArrival')), stamp(row.get('actualDeparture'))
    arrival = arrival if status in ARRIVED_STATES and arrival and arrival <= observed and arrival <= now else None
    departure = departure if status in DEPARTED_STATES and departure and departure <= observed and departure <= now else None
    if context and state(context.get('status')) in RUNNING_STATES:
        location = context.get('currentLocation') or {}
        sequence = location.get('sequence') if isinstance(location, dict) else None
        if type(sequence) is int and type(row.get('sequence')) is int:
            current = [r for r in context.get('route', []) if r.get('sequence') == sequence]
            if len(current) == 1 and current[0].get('stationCode') == location.get('stationCode'):
                if row['sequence'] > sequence:
                    return None, None
                if row['sequence'] == sequence and state(location.get('status')) in {'arrived', 'at-station', 'halted', 'stopped'}:
                    departure = None
    if arrival and departure and departure < arrival:
        return None, None
    return arrival, departure


def skipped_kind(data, row):
    status = state(row.get('status'))
    if status in {'cancelled', 'canceled'}:
        return 'cancelled'
    if status in {'skipped', 'not-stopping'}:
        return 'skipped'
    # Documented diversion skippedStations can override a still-upcoming row.
    exceptions = data.get('exceptions')
    for event in exceptions if isinstance(exceptions, list) else []:
        diversion = event.get('diverted') if isinstance(event, dict) else None
        skipped = diversion.get('skippedStations') if isinstance(diversion, dict) else None
        for item in skipped if isinstance(skipped, list) else []:
            if not isinstance(item, dict) or item.get('code') != row.get('stationCode'):
                continue
            sequence = item.get('scheduledSequence')
            visits = [r for r in data.get('route', []) if r.get('stationCode') == item['code']]
            if type(sequence) is int:
                matches = [r for r in visits if type(r.get('sequence')) is int and r['sequence'] == sequence]
                if len(matches) != 1:
                    return 'unavailable'
                if row.get('sequence') == sequence:
                    return 'skipped'
                if type(row.get('sequence')) is not int:
                    return 'unavailable'
            elif sequence is None and len(visits) == 1:
                return 'skipped'
            else:
                return 'unavailable'
    return None


def time_text(value, now):
    value = value.astimezone(IST)
    year = f' {value.year}' if value.year != now.astimezone(IST).year else ''
    return f'{value.day} {MONTHS[value.month-1]}{year}, {value.hour % 12 or 12}:{value.minute:02d} {"AM" if value.hour < 12 else "PM"} IST'


def duration(value):
    value = abs(round(value))
    return f'{value} minute' + ('' if value == 1 else 's')


def relative(delay):
    delay = round(delay)
    return 'on time' if delay == 0 else f'{duration(delay)} {"late" if delay > 0 else "early"}'


def latest_report(data, now):
    """Return a named current report only when station identity is unambiguous."""
    location = data.get('currentLocation') or {}
    if not isinstance(location, dict):
        return None
    rows = [r for r in data.get('route', []) if r.get('stationCode') == location.get('stationCode')]
    if location.get('sequence') is not None:
        rows = [r for r in rows if r.get('sequence') == location['sequence']]
    return rows[0] if len(rows) == 1 else None


def running_details(data, prediction, target, now, previous):
    details = []
    current_delay = number(data.get('delayMinutes'))
    expected_delay = number(prediction.get('predicted_delay_minutes'))
    current = latest_report(data, now)
    if current is not None and current_delay is not None:
        details.append(f'The latest update at {name(current)} reports the train {relative(current_delay)}.')
    elif current_delay is not None:
        details.append(f'The latest running update reports the train {relative(current_delay)}.')

    if previous and prediction.get('_route_order_adjusted'):
        details.append(f'This arrival also allows for the train to reach {name(previous)} first.')
    elif prediction.get('prediction_method') == 'inference' and current_delay is not None and expected_delay is not None:
        change = round(expected_delay - current_delay)
        if change < 0:
            details.append(f'The train may make up about {duration(change)} before reaching {target}.')
        elif change > 0:
            details.append(f'The train may take about {duration(change)} longer than planned before reaching {target}.')
        else:
            details.append(f'Recent running updates and past journeys suggest the delay may stay about the same before {target}.')
    elif current_delay is not None:
        details.append(f'The arrival at {target} assumes the train continues with its latest reported delay.')

    # Confirmed extra dwell is an observation, not evidence of a signal/platform cause.
    if current is not None and current.get('isHalt') is True and expected_delay is not None and expected_delay > 0:
        observed = stamp(data.get('lastUpdatedAt'))
        arrived, departed = confirmed_times(current, observed, now, data)
        scheduled_arrival, scheduled_departure = stamp(current.get('scheduledArrival')), stamp(current.get('scheduledDeparture'))
        if arrived and departed and scheduled_arrival and scheduled_departure and scheduled_departure >= scheduled_arrival:
            planned = (scheduled_departure-scheduled_arrival).total_seconds()/60
            actual = (departed-arrived).total_seconds()/60
            if round(actual-planned) > 0:
                details.append(f'At {name(current)}, the train stopped for {duration(actual)} instead of the planned {duration(planned)}.')
    if expected_delay is not None and expected_delay > 0:
        details.append('The railway update has not given a reason for the delay.')
    return details


def explain_stop(data, row, prediction, now, fresh, previous=None):
    target = name(row)
    scheduled = stamp(prediction.get('scheduled_arrival'))
    estimated = stamp(prediction.get('predicted_arrival'))
    actual = stamp(prediction.get('actual_arrival'))
    journey_state = state(data.get('status'))
    skipped = skipped_kind(data, row)
    result = {'status': 'unavailable', 'title': f'Arrival update for {target}', 'summary': '', 'details': []}

    if actual:
        delay = (actual-scheduled).total_seconds()/60 if scheduled else None
        result.update(status='arrived', title=f'Arrived at {target}',
                      summary=f'The train arrived at {target} on {time_text(actual, now)}' + (f', {relative(delay)}.' if delay is not None else '.'))
        return result
    if skipped == 'unavailable':
        result['summary'] = f'The route update does not clearly identify which visit to {target} is affected. An arrival estimate cannot be confirmed.'
        return result
    if skipped or journey_state in {'cancelled', 'canceled'}:
        kind = skipped or 'cancelled'
        result.update(status=kind, title=f'{"Stop skipped" if kind == "skipped" else "No arrival"} at {target}',
                      summary=f'The railway update says the train will not call at {target}.' if kind == 'skipped'
                      else f'The latest railway update marks this {"stop" if skipped else "journey"} as cancelled. There is no expected arrival at {target}.')
        return result
    if journey_state == 'not-started':
        result.update(status='not_started', title=f'Journey has not started',
                      summary=f'The latest update says this journey has not started. An arrival estimate for {target} is not available yet.')
    elif journey_state in {'completed', 'terminated'}:
        result['summary'] = f'The latest update says this journey has ended. An arrival time at {target} was not reported.'
    elif estimated and fresh and journey_state in RUNNING_STATES:
        delay = (estimated-scheduled).total_seconds()/60 if scheduled else None
        category = 'on_time' if delay is not None and round(delay) == 0 else 'early' if delay is not None and delay < 0 else 'delayed' if delay is not None else 'unavailable'
        if delay is not None:
            result.update(status=category, title=f'Expected {relative(delay)} at {target}',
                          summary=f'Your train is expected at {target} on {time_text(estimated, now)}, {relative(delay)}.',
                          details=running_details(data, prediction, target, now, previous))
            return result
        result['summary'] = f'An arrival estimate for {target} could not be checked against a dated schedule.'
    elif not fresh:
        result['summary'] = f'A recent running update is unavailable. An arrival estimate for {target} cannot be confirmed.'
    elif state(row.get('status')) in ARRIVED_STATES:
        result['summary'] = f'The railway update marks {target} as reached, but a confirmed arrival time was not provided.'
    else:
        result['summary'] = f'An arrival estimate for {target} is not available from the latest railway update.'
    if scheduled:
        result['details'].append(f'Scheduled arrival at {target}: {time_text(scheduled, now)}. This is the timetable, not a current arrival estimate.')
    return result
