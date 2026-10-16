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


def event(row, observed, now, data):
    arrived, departed = confirmed_times(row, observed, now, data)
    sa, sd = stamp(row.get('scheduledArrival')), stamp(row.get('scheduledDeparture'))
    if skipped_kind(data, row):
        return None
    if departed and sd:
        return {'row': row, 'actual': departed, 'scheduled': sd, 'kind': 'departure',
                'delay': (departed-sd).total_seconds()/60}
    if arrived and sa:
        return {'row': row, 'actual': arrived, 'scheduled': sa, 'kind': 'arrival',
                'delay': (arrived-sa).total_seconds()/60}
    return None


def journey_timing(data, now):
    """Measured changes from this snapshot; no timetable slack is invented.

    The current reported delay is compared with an earlier confirmed station
    event. A current confirmed event, when present, must agree to the minute.
    Future recovery is calculated separately from the selected stop forecast.
    """
    current_delay = number(data.get('delayMinutes'))
    result = {'current_delay_minutes': round(current_delay) if current_delay is not None else None,
              'recovered_minutes': None, 'recovery_from_station': None,
              'recovery_to_station': None, '_details': [], '_cause': None}
    current = latest_report(data, now)
    route = data.get('route', [])
    sequences = [r.get('sequence') for r in route]
    if (current is None or current_delay is None or any(type(s) is not int for s in sequences)
            or sequences != sorted(set(sequences))):
        return result
    index = next(i for i,r in enumerate(route) if r is current)
    observed = stamp(data.get('lastUpdatedAt'))
    if not observed or observed > now or skipped_kind(data, current):
        return result
    current_event = event(current, observed, now, data)
    # Check every known arrival/departure, not only each stop's final event.
    # Otherwise A departing after B arrived could falsely explain B's halt.
    phases = []
    for position,r in enumerate(route[:index+1]):
        if skipped_kind(data,r):
            continue
        a,d = confirmed_times(r,observed,now,data)
        for actual,scheduled in [(a,stamp(r.get('scheduledArrival'))),(d,stamp(r.get('scheduledDeparture')))]:
            if actual:
                phases.append((position,actual,scheduled))
    coherent = all(a[1] <= b[1] and (a[0] == b[0] or a[1] < b[1])
                   and (a[2] is None or b[2] is None or a[2] <= b[2])
                   for a,b in zip(phases,phases[1:]))
    if not coherent:
        return result
    earlier = [event(r, observed, now, data) for r in route[:index]]
    earlier = [e for e in earlier if e]
    anchor = earlier[-1] if earlier else None
    arrived, departed = confirmed_times(current, observed, now, data)
    sa, sd = stamp(current.get('scheduledArrival')), stamp(current.get('scheduledDeparture'))
    # With no earlier station, a completed halt can still measure recovery.
    if anchor is None and current.get('isHalt') is True and arrived and departed and sa and sd:
        anchor = {'row': current, 'actual': arrived, 'scheduled': sa,
                  'kind': 'arrival', 'delay': (arrived-sa).total_seconds()/60}
    comparison_time = current_event['actual'] if current_event else observed
    comparison_schedule = current_event['scheduled'] if current_event else None
    comparable = (anchor is not None and anchor['actual'] < comparison_time
                  and (comparison_schedule is None or anchor['scheduled'] < comparison_schedule)
                  and all(a['actual'] < b['actual'] and a['scheduled'] < b['scheduled']
                          for a,b in zip(earlier,earlier[1:]))
                  and (current_event is None or round(current_event['delay']) == round(current_delay)))
    if comparable:
        before, after = max(0, round(anchor['delay'])), max(0, round(current_delay))
        recovered = max(0, before-after)
        result.update(recovered_minutes=recovered, recovery_from_station=name(anchor['row']),
                      recovery_to_station=name(current))
        if recovered:
            where = f'during the stop at {name(current)}' if anchor['row'] is current else f'since {name(anchor["row"])}'
            result['_details'].append(f'The train has already recovered {duration(recovered)} {where}; its reported delay changed from {relative(anchor["delay"])} to {relative(current_delay)}.')
        elif after > before:
            result['_details'].append(f'The train has lost {duration(after-before)} since {name(anchor["row"])}; it is now {relative(current_delay)}.')

    if current_delay <= 0 or (departed and current_event and round(current_event['delay']) != round(current_delay)):
        return result
    # Longer stops explain added lateness, not the underlying operational cause.
    if current.get('isHalt') is True and arrived and sa and sd and sd >= sa:
        planned = (sd-sa).total_seconds()/60
        if departed:
            actual = (departed-arrived).total_seconds()/60
            added = max(0,(departed-sd).total_seconds()/60)-max(0,(arrived-sa).total_seconds()/60)
            if round(added) > 0 and round(actual-planned) > 0:
                result['_cause'] = f'At {name(current)}, the train stopped for {duration(actual)} instead of the planned {duration(planned)}, adding {duration(added)} to its delay.'
        elif state((data.get('currentLocation') or {}).get('status')) in {'arrived','at-station','halted','stopped'}:
            elapsed = (observed-arrived).total_seconds()/60
            added = max(0,(observed-sd).total_seconds()/60)-max(0,(arrived-sa).total_seconds()/60)
            if round(added) > 0 and round(elapsed-planned) > 0:
                result['_cause'] = f'At the latest update, the train had been at {name(current)} for at least {duration(elapsed)} (planned {duration(planned)}). This longer stop may be adding to the delay.'
    # A reported location may be a passing point after the last halting station.
    # Use only the latest completed halt, and only while its added lateness has
    # not been fully recovered in any later known timing.
    if result['_cause'] is None:
        for position in range(index-1,-1,-1):
            row = route[position]
            if row.get('isHalt') is not True or skipped_kind(data,row):
                continue
            a,d = confirmed_times(row,observed,now,data)
            if not a or not d:
                continue
            planned_a,planned_d = stamp(row.get('scheduledArrival')),stamp(row.get('scheduledDeparture'))
            if not planned_a or not planned_d or planned_d < planned_a:
                break
            start_late,end_late = max(0,(a-planned_a).total_seconds()/60),max(0,(d-planned_d).total_seconds()/60)
            added = end_late-start_late
            later = [max(0,(phase[1]-phase[2]).total_seconds()/60) for phase in phases
                     if phase[0] > position and phase[2] is not None]
            if (round(added) > 0 and current_delay >= end_late
                    and all(value > start_late for value in later)):
                result['_cause'] = f'The last confirmed stop at {name(row)} took {duration((d-a).total_seconds()/60)} instead of {duration((planned_d-planned_a).total_seconds()/60)}, adding {duration(added)} to the delay. Some of this delay may still be carrying forward.'
            break
    if result['_cause'] is None and index > 0 and arrived and sa:
        before = route[index-1]
        _, left = confirmed_times(before, observed, now, data)
        planned_left = stamp(before.get('scheduledDeparture'))
        if left and planned_left and not skipped_kind(data,before) and left < arrived and planned_left < sa:
            extra = ((arrived-left)-(sa-planned_left)).total_seconds()/60
            added = max(0,(arrived-sa).total_seconds()/60)-max(0,(left-planned_left).total_seconds()/60)
            if round(extra) > 0 and round(added) > 0:
                result['_cause'] = f'The journey from {name(before)} to {name(current)} took {duration(extra)} longer than scheduled. The cause of the slower journey was not reported.'
    return result


def stop_timing(evidence, prediction):
    result = {k:v for k,v in evidence.items() if not k.startswith('_')}
    result.update(expected_recovery_minutes=None, expected_additional_delay_minutes=None,
                  future_recovery_status='not_estimated')
    current, expected = number(result['current_delay_minutes']), number(prediction.get('predicted_delay_minutes'))
    if prediction.get('_route_order_adjusted'):
        result['future_recovery_status'] = 'route_order_adjusted'
    elif prediction.get('prediction_method') == 'inference' and current is not None and expected is not None:
        change = round(max(0,current)-max(0,expected))
        result.update(expected_recovery_minutes=max(0,change), expected_additional_delay_minutes=max(0,-change),
                      future_recovery_status='estimated')
    return result


def running_details(data, prediction, target, now, previous, evidence):
    details = []
    current_delay = number(data.get('delayMinutes'))
    expected_delay = number(prediction.get('predicted_delay_minutes'))
    current = latest_report(data, now)
    if current is not None and current_delay is not None:
        details.append(f'The latest update at {name(current)} reports the train {relative(current_delay)}.')
    elif current_delay is not None:
        details.append(f'The latest running update reports the train {relative(current_delay)}.')

    details.extend(evidence['_details'])
    if evidence['_cause']:
        details.append(evidence['_cause'])

    if previous and prediction.get('_route_order_adjusted'):
        details.append(f'This arrival also allows for the train to reach {name(previous)} first.')
    elif prediction.get('prediction_method') == 'inference' and current_delay is not None and expected_delay is not None:
        change = round(max(0,expected_delay) - max(0,current_delay))
        if change < 0:
            details.append(f'The train may make up about {duration(change)} before reaching {target}.')
        elif change > 0:
            details.append(f'The train may take about {duration(change)} longer than planned before reaching {target}.')
        elif current_delay < 0 or expected_delay < 0:
            details.append(f'Past journeys help estimate the arrival at {target}. The train may still arrive early; the time can change with new updates.')
        else:
            details.append(f'Recent running updates and past journeys suggest the delay may stay about the same before {target}.')
    elif current_delay is not None:
        details.append(f'Future recovery before {target} cannot yet be estimated. This arrival keeps the latest reported delay.')
    if expected_delay is not None and expected_delay > 0:
        details.append('The railway update has not confirmed the underlying reason for the delay.' if evidence['_cause']
                       else 'The railway update has not given a reason for the delay.')
    return details


def explain_stop(data, row, prediction, now, fresh, previous=None, evidence=None):
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
            evidence = evidence if evidence is not None else journey_timing(data, now)
            result.update(status=category, title=f'Expected {relative(delay)} at {target}',
                          summary=f'Your train is expected at {target} on {time_text(estimated, now)}, {relative(delay)}.',
                          details=running_details(data, prediction, target, now, previous, evidence),
                          timing=stop_timing(evidence, prediction))
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
