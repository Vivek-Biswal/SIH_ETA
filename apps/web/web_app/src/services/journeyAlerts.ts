import { validDate, type Journey, type Prediction, type Status } from './passenger';
import { matchingStop, predictionKey, selectedPrediction, stationArrival } from './etaReason';

export const ALERTS_KEY = 'etaernal_journey_alerts_v1';
export const WATCH_LIMIT = 3;
export const CHECK_INTERVAL = 120000;
export type Watch = { id: string; number: string; date: string; station: string; threshold: number };
export type Preferences = { watches: Watch[]; read: string[] };
export type Comparison = { date: string; station: string; expected: string; observed: number };
export type Check = { journey: Journey | null; checkedAt: number; error: string; previous?: Comparison | null };
export type JourneyAlert = {
  id: string; watchId: string; kind: 'delay' | 'service' | 'changed' | 'arrival';
  severity: 'attention' | 'info'; title: string; message: string; details: string[];
  observed: string; number: string; date: string; station: string;
};

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return { watches: [], read: [] };
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.watches) || !Array.isArray(data.read)) throw Error('Saved journey alerts could not be read.');
  const watches: Watch[] = [];
  for (const item of data.watches.slice(0, WATCH_LIMIT)) {
    if (!item || typeof item.id !== 'string' || !/^[\w-]{1,80}$/.test(item.id) || typeof item.number !== 'string' || !/^\d{5}$/.test(item.number)
      || typeof item.date !== 'string' || (item.date && !validDate(item.date))
      || typeof item.station !== 'string' || (item.station && !/^(?:route:\d{1,5}|[A-Z0-9]{2,10})$/.test(item.station))
      || ![5, 15, 30, 60].includes(item.threshold)) continue;
    if (watches.some(w => w.id === item.id || (w.number === item.number && w.date === item.date))) continue;
    watches.push({ id: item.id, number: item.number, date: item.date, station: item.station, threshold: item.threshold });
  }
  return { watches, read: data.read.filter((id: unknown): id is string => typeof id === 'string' && id.length <= 300).slice(-200) };
}

export function observation(status: Status | null | undefined, now: number): string | null {
  const value = status?.last_known_location?.updated_at;
  if (status?.data_source !== 'live' || !value || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const age = now - Date.parse(value);
  return Number.isFinite(age) && age >= 0 && age <= 300000 ? value : null;
}

export function watchView(watch: Watch, check: Check | undefined, now: number) {
  const journey = check?.journey;
  const reportedStatus = journey?.status;
  const status = reportedStatus ? { ...reportedStatus,
    status: typeof reportedStatus.status === 'string' ? reportedStatus.status : 'unknown',
    route: Array.isArray(reportedStatus.route) ? reportedStatus.route.filter(s => s && typeof s === 'object') : [],
  } : undefined;
  const matches = status?.train_number === watch.number && validDate(status.date) && (!watch.date || watch.date === status.date);
  const observed = matches ? observation(status, now) : null;
  const reportedPredictions = journey?.eta?.train_number === watch.number && journey.eta.date === status?.date
    ? journey.eta.remaining_stations.filter(p => p && typeof p === 'object'
      && typeof p.station?.code === 'string' && p.station.code.trim()
      && typeof p.station?.name === 'string' && p.station.name.trim()
      && (p.route_sequence == null || Number.isInteger(p.route_sequence) && p.route_sequence >= 0)) : [];
  const predictions = reportedPredictions.filter(p => selectedPrediction(reportedPredictions, predictionKey(p)) === p);
  let prediction: Prediction | undefined;
  if (watch.station) prediction = selectedPrediction(predictions, watch.station);
  else prediction = predictions.find(p => {
    const stop = matchingStop(status, p);
    return !stop?.has_departed && stop?.arrival_confirmed !== true && Boolean(p.station && p.scheduled_arrival)
      && Date.parse(p.scheduled_arrival!) >= now - 300000
      && (!stop || stop.scheduled_arrival !== stop.scheduled_departure);
  }) || predictions.find(p => Date.parse(p.predicted_arrival || '') >= now);
  const arrival = stationArrival(journey?.eta || null, status, prediction, now);
  const reliable = Boolean(observed && !check?.error);
  return { status, predictions, prediction, arrival, observed, reliable, station: prediction?.station?.name || watch.station || 'next reported stop' };
}

export function comparison(watch: Watch, check: Check | undefined): Comparison | null {
  if (!check) return null;
  const view = watchView(watch, check, check.checkedAt);
  return view.reliable && view.arrival.predictedArrival && view.prediction && view.status
    ? { date: view.status.date, station: predictionKey(view.prediction), expected: view.arrival.predictedArrival, observed: Date.parse(view.observed!) } : null;
}

export function buildAlerts(watch: Watch, check: Check | undefined, now: number): JourneyAlert[] {
  const view = watchView(watch, check, now);
  if (!view.reliable || !view.status || !view.observed) return [];
  const alerts: JourneyAlert[] = [];
  const state = String(view.status.status || 'unknown').toLowerCase().replaceAll('_', '-');
  const station = view.prediction ? predictionKey(view.prediction) : '';
  const base = { watchId: watch.id, observed: view.observed, number: watch.number, date: view.status.date, station };
  const key = `${watch.id}:${view.status.date}:${view.prediction ? predictionKey(view.prediction) : 'journey'}`;
  const add = (kind: JourneyAlert['kind'], severity: JourneyAlert['severity'], title: string, message: string, details: string[] = [], suffix = '') => {
    alerts.push({ ...base, id: `${key}:${kind}${suffix}`, kind, severity, title, message, details });
  };
  if (state === 'cancelled' || state === 'canceled') {
    add('service', 'attention', 'Journey reported cancelled', 'The latest railway update reports this journey as cancelled. Check the journey details before travelling.');
    return alerts;
  }
  if (['cancelled', 'skipped'].includes(view.arrival.status) && !view.arrival.stale) {
    add('service', 'attention', view.arrival.title, view.arrival.summary, view.arrival.details);
    return alerts;
  }
  if (state === 'not-started') {
    add('service', 'info', 'Journey has not started', 'The latest update says this journey has not started. Scheduled times are not live arrival estimates.');
    return alerts;
  }
  if (view.arrival.actualArrival) {
    add('arrival', 'info', `Arrival recorded at ${view.station}`, view.arrival.summary, view.arrival.details);
    return alerts;
  }
  const expected = view.arrival.predictedArrival;
  const delay = view.arrival.delayMinutes;
  if (expected && delay !== null && delay >= watch.threshold) {
    add('delay', 'attention', `Expected ${delay} min late at ${view.station}`, view.arrival.summary, view.arrival.details, `:${Math.floor(delay / 5)}`);
  } else if (!expected && ['running', 'in-transit', 'at-station', 'halted', 'stopped', 'departed', 'delayed'].includes(state)) {
    const reported = view.status.last_known_location?.delay_minutes;
    if (typeof reported === 'number' && Number.isFinite(reported) && reported >= watch.threshold) {
      const place = view.status.current_station?.name;
      add('delay', 'attention', `Reported ${Math.round(reported)} min late`, `The latest update${place ? ` near ${place}` : ''} reports this delay. An arrival estimate for your selected stop is unavailable; the delay cause is not confirmed.`, [], `:${Math.floor(reported / 5)}`);
    }
  }
  if (expected && view.prediction) {
    const left = Math.ceil((Date.parse(expected) - now) / 60000);
    if (left >= 0 && left <= 30) add('arrival', 'info', `Arrival expected within ${Math.max(1, left)} min`, view.arrival.summary, ['This is an estimate and can change. It is not a platform announcement.']);
    const previous = check?.previous;
    if (previous && previous.date === view.status.date && previous.station === predictionKey(view.prediction)
      && Date.parse(view.observed) > previous.observed) {
      const change = Math.round((Date.parse(expected) - Date.parse(previous.expected)) / 60000);
      if (Number.isFinite(change) && Math.abs(change) >= 5) add('changed', change > 0 ? 'attention' : 'info',
        `Arrival estimate moved ${Math.abs(change)} min ${change > 0 ? 'later' : 'earlier'}`,
        view.arrival.summary, ['Compared with your previous successful check for this same journey and stop. This describes a change in the estimate, not a confirmed cause.'], `:${view.observed}`);
    }
  }
  return alerts;
}

export function journeyLink(number: string, date: string, station = '') {
  const query = new URLSearchParams();
  if (date) query.set('date', date);
  if (station) query.set('station', station);
  return `/trains/${number}/eta${query.size ? `?${query}` : ''}`;
}
