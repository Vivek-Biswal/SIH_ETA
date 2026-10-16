import type { ArrivalExplanation, ETA, Prediction, Status, Stop } from './passenger';

type ArrivalView = ArrivalExplanation & {
  actualArrival: string | null; predictedArrival: string | null; delayMinutes: number | null;
  stale: boolean; observed: string | null; basis: string; method: string;
};

const runningStates = new Set(['running', 'in-transit', 'at-station', 'arrived', 'halted', 'stopped', 'departed', 'delayed']);
const forecastMethods = new Set(['inference', 'delay_adjusted']);

function instant(value?: string | null) {
  // A time of day alone cannot establish which journey day an update belongs to.
  if (!value || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
  return Date.parse(value);
}

function supportedExplanation(explanation: ArrivalExplanation | undefined, state: string): explanation is ArrivalExplanation {
  return Boolean(explanation?.status === state && typeof explanation.title === 'string' && explanation.title.trim()
    && typeof explanation.summary === 'string' && explanation.summary.trim()
    && Array.isArray(explanation.details) && explanation.details.every(detail => typeof detail === 'string'));
}

export function arrivalTime(value?: string | null) {
  const parsed = instant(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' IST' : 'time unavailable';
}

export function predictionKey(prediction: Prediction) {
  return Number.isInteger(prediction.route_sequence) ? `route:${prediction.route_sequence}` : prediction.station?.code || '';
}

export function selectedPrediction(predictions: Prediction[], selection: string) {
  const matches = predictions.filter(prediction => selection.startsWith('route:')
    ? predictionKey(prediction) === selection : prediction.station?.code === selection);
  return matches.length === 1 ? matches[0] : undefined;
}

export function matchingStop(status: Status | null | undefined, prediction?: Prediction) {
  if (!prediction?.station) return undefined;
  const matches = status?.route.filter(stop => stop.station?.code === prediction.station?.code && (
    !Number.isInteger(prediction.route_sequence) || stop.route_sequence === prediction.route_sequence
  )) || [];
  return matches.length === 1 ? matches[0] : undefined;
}

export function confirmedStopTime(stop: Stop, kind: 'arrival' | 'departure', observed?: string | null, now = Date.now()) {
  const value = kind === 'arrival' ? stop.actual_arrival : stop.actual_departure;
  const confirmed = kind === 'arrival' ? stop.arrival_confirmed : stop.departure_confirmed;
  const actual = instant(value), update = instant(observed);
  return confirmed === true && Number.isFinite(actual) && actual <= now && Number.isFinite(update) && actual <= update ? value : null;
}

/** A station's explanation must never borrow a cause or model label from another stop. */
export function stationArrival(eta: ETA | null, status: Status | null | undefined, prediction?: Prediction, now = Date.now()): ArrivalView {
  const name = prediction?.station?.name || prediction?.station?.code || 'this station';
  const observed = eta?.observation_timestamp || status?.last_known_location?.updated_at || null;
  const update = instant(observed), age = now - update;
  const stale = eta?.data_source !== 'live' || status?.data_source !== 'live'
    || !Number.isFinite(age) || age < 0 || age > 300000;
  // A route can mix model and simpler estimates. A global model label cannot
  // establish whether this particular stop was predicted by the model.
  const method = prediction?.prediction_method || (eta?.prediction_method === 'inference' ? 'schedule_only' : eta?.prediction_method) || 'schedule_only';
  const basis = method === 'inference' ? 'Based on recent running updates and past journeys'
    : forecastMethods.has(method) ? 'Based on the latest running update' : 'Scheduled time only';
  const base: ArrivalView = { status: 'unavailable', title: `Arrival at ${name}`, summary: `We cannot confirm an arrival time for ${name} yet.`,
    details: [], actualArrival: null, predictedArrival: null, delayMinutes: null, stale, observed, basis: 'No current arrival estimate', method };
  if (!prediction?.station) return { ...base, title: 'Choose a station', summary: 'Choose a station with a clear route entry to see its arrival information.' };
  const sameJourney = Boolean(eta && (!status || eta.train_number === status.train_number && eta.date === status.date));
  if (!sameJourney) return { ...base, summary: `The running updates do not match this journey. Refresh to check arrival at ${name}.` };

  // This field is supplied only for confirmed station arrivals by the ETA contract.
  // Legacy status-route actual* fields may contain forecasts and are not used here.
  const actual = instant(prediction.actual_arrival), scheduled = instant(prediction.scheduled_arrival);
  const explanation = prediction.arrival_explanation;
  if (Number.isFinite(actual) && actual <= now && Number.isFinite(update) && actual <= update) {
    const difference = Number.isFinite(scheduled) ? Math.round((actual - scheduled) / 60000) : null;
    const when = difference === null ? '' : difference > 0 ? `, ${difference} minutes later than scheduled`
      : difference < 0 ? `, ${Math.abs(difference)} minutes earlier than scheduled` : ', on schedule';
    const supported = supportedExplanation(explanation, 'arrived');
    return { ...base, status: 'arrived', title: supported ? explanation.title : `Arrived at ${name}`,
      summary: supported ? explanation.summary : `The train arrived at ${name} at ${arrivalTime(prediction.actual_arrival)}${when}.`,
      actualArrival: prediction.actual_arrival!, delayMinutes: difference, basis: 'Confirmed arrival',
      details: supported ? explanation.details : ['This is a recorded arrival, rather than an arrival estimate.'] };
  }
  const state = status?.status?.toLowerCase().replaceAll('_', '-') || 'unknown';
  // Non-running and stop exceptions are reports rather than forecasts. Their
  // source is often labelled cached even when the status was just retrieved.
  // Keep that information, explicitly qualified when old, but never its ETA.
  const asReport = (report: ArrivalExplanation): ArrivalView => ({
    ...base, status: report.status, title: stale ? `Latest report: ${report.title}` : report.title,
    summary: stale ? `The latest available update says: ${report.summary}` : report.summary,
    details: report.details,
    basis: 'Latest available report · Scheduled time only', method: 'schedule_only',
  });
  if (explanation && ['not_started', 'cancelled', 'skipped', 'unavailable'].includes(explanation.status)
    && supportedExplanation(explanation, explanation.status)) return asReport(explanation);
  if (state === 'cancelled' || state === 'canceled') return asReport({ status: 'cancelled', title: 'Train cancelled',
    summary: `This journey is cancelled. There is no expected arrival at ${name}.`, details: [] });
  if (state === 'not-started') return asReport({ status: 'not_started', title: 'The journey has not started',
    summary: `The train has not started this journey. ${Number.isFinite(scheduled) ? `Its scheduled arrival at ${name} is ${arrivalTime(prediction.scheduled_arrival)}.` : `A scheduled arrival at ${name} is not available.`}`,
    details: [] });
  if (['completed', 'terminated'].includes(state)) return asReport({ status: 'unavailable', title: 'This journey has ended',
    summary: `The journey has ended, but a confirmed arrival at ${name} is not available.`, details: [] });
  if (stale) return { ...base, title: `Waiting for an update for ${name}`,
    summary: `We need a newer train update before showing an arrival estimate for ${name}.`,
    details: Number.isFinite(update) ? [`The last running update was at ${arrivalTime(observed)}.`] : [] };
  if (!runningStates.has(state)) return { ...base, title: 'Waiting for a running update',
    summary: `The train's current running status is not confirmed. We cannot give a reliable arrival estimate for ${name}.` };
  const forecast = instant(prediction.predicted_arrival);
  if (!forecastMethods.has(method) || !Number.isFinite(scheduled) || !Number.isFinite(forecast) || forecast < now) return {
    ...base, title: `Arrival estimate unavailable for ${name}`,
    summary: `A current arrival estimate for ${name} is not available.${Number.isFinite(scheduled) ? ` The scheduled arrival is ${arrivalTime(prediction.scheduled_arrival)}.` : ''}`,
    basis: 'Scheduled time only',
  };
  const delay = Math.round((forecast - scheduled) / 60000);
  const arrivalStatus = delay > 0 ? 'delayed' : delay < 0 ? 'early' : 'on_time';
  const title = delay > 0 ? `${delay} min late at ${name}` : delay < 0 ? `${Math.abs(delay)} min early at ${name}` : `On time at ${name}`;
  const summary = `The train is expected at ${name} at ${arrivalTime(prediction.predicted_arrival)}${delay > 0 ? `, ${delay} minutes later than scheduled` : delay < 0 ? `, ${Math.abs(delay)} minutes earlier than scheduled` : ', on schedule'}.`;
  const details: string[] = [];
  const latestDelay = status?.last_known_location?.delay_minutes;
  if (typeof latestDelay === 'number' && Number.isFinite(latestDelay)) {
    const place = status?.current_station?.name ? ` near ${status.current_station.name}` : '';
    details.push(`The latest update${place} shows the train ${latestDelay > 0 ? `${latestDelay} minutes late` : latestDelay < 0 ? `${Math.abs(latestDelay)} minutes early` : 'running on schedule'}.`);
    const change = Math.round(latestDelay - delay);
    if (method === 'inference' && change > 0) details.push(`It is expected to make up about ${change} minutes before ${name}.`);
    else if (method === 'inference' && change < 0) details.push(`It is expected to lose about ${Math.abs(change)} more minutes before ${name}.`);
    else if (method !== 'inference') details.push(`This estimate assumes the train keeps its currently reported timing until ${name}.`);
  }
  if (delay > 0) details.push('The running update does not confirm what caused the delay.');
  const supported = supportedExplanation(explanation, arrivalStatus);
  return { ...base, status: arrivalStatus, title: supported ? explanation.title : title,
    summary: supported ? explanation.summary : summary, details: supported ? explanation.details : details,
    predictedArrival: prediction.predicted_arrival!, delayMinutes: delay, basis };
}
