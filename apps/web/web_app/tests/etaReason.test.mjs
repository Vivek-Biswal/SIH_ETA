import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function evaluate(path, imports = {}) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compile(path))(name => imports[name] ?? require(name), module, module.exports);
  return module.exports;
}
const reasons = evaluate('../src/services/etaReason.ts');
const passenger = evaluate('../src/services/passenger.ts');
const { PassengerJourney } = evaluate('../src/components/eta/PassengerJourney.tsx', {
  '@/services/passenger': passenger, '@/services/etaReason': reasons,
  '@/services/preferences': { useLiveRefresh: () => 120000 },
  'lucide-react': { Clock3: () => null, RefreshCw: () => null, TrainFront: () => null, ChevronDown: () => null },
  './ArrivalWeather': { ArrivalWeather: () => null }, './EtaFeedback': { EtaFeedback: () => null }, './IncidentReport': { IncidentReport: () => null },
  './RouteTimeline.module.css': { default: new Proxy({}, { get: (_, name) => String(name) }) },
});

const now = Date.parse('2026-10-16T12:00:00Z');
const timestamp = minutes => new Date(now + minutes * 60000).toISOString();
function journey(overrides = {}) {
  const prediction = { station: { code: 'JP', name: 'Jaipur' }, route_sequence: 5, scheduled_arrival: timestamp(60), predicted_arrival: timestamp(80), prediction_method: 'delay_adjusted', ...overrides };
  const status = { train_number: '12345', date: '2026-10-16', data_source: 'live', status: 'running',
    current_station: { code: 'AWR', name: 'Alwar' }, last_known_location: { updated_at: timestamp(-1), delay_minutes: 20 }, route: [] };
  const eta = { train_number: '12345', date: '2026-10-16', data_source: 'live', prediction_method: 'delay_adjusted',
    observation_timestamp: timestamp(-1), remaining_stations: [prediction], explanation: 'Generic signal failure used everywhere',
    model_metadata: { status: 'fallback', name: 'eta-gbr-landmark-v1', validation: { mae_minutes: 15.4, rmse_minutes: 27.2, test_journeys: 229 } } };
  return { eta, status, prediction };
}

test('late explanation names selected station, revised arrival and observed delay without inventing a cause', () => {
  const { eta, status, prediction } = journey();
  const view = reasons.stationArrival(eta, status, prediction, now);
  assert.equal(view.status, 'delayed');
  assert.match(view.summary, /Jaipur.*20 minutes later than scheduled/);
  assert.match(view.summary, /18:50 IST/);
  assert.match(view.details.join(' '), /Alwar.*20 minutes late/);
  assert.match(view.details.join(' '), /does not confirm what caused/);
  assert.doesNotMatch(JSON.stringify(view), /signal failure/);
});

test('on-time and early stops receive their own accurate arrival message', () => {
  for (const [minutes, state, wording] of [[60, 'on_time', /on schedule/], [50, 'early', /10 minutes earlier/]]) {
    const { eta, status, prediction } = journey({ predicted_arrival: timestamp(minutes) });
    const view = reasons.stationArrival(eta, status, prediction, now);
    assert.equal(view.status, state);
    assert.match(view.summary, wording);
    assert.doesNotMatch(view.details.join(' '), /caused the delay/);
  }
});

test('switching stations uses each stop forecast and supported explanation', () => {
  const { eta, status, prediction } = journey();
  const next = { ...prediction, route_sequence: 8, station: { code: 'AII', name: 'Ajmer' }, scheduled_arrival: timestamp(180), predicted_arrival: timestamp(185), prediction_method: 'inference',
    arrival_explanation: { status: 'delayed', title: '5 min late at Ajmer', summary: 'Ajmer is expected at 20:35 IST, 5 minutes late.', details: ['The train is expected to make up 15 minutes before Ajmer.'] } };
  eta.remaining_stations.push(next); eta.prediction_method = 'inference';
  const first = reasons.stationArrival(eta, status, reasons.selectedPrediction(eta.remaining_stations, 'route:5'), now);
  const second = reasons.stationArrival(eta, status, reasons.selectedPrediction(eta.remaining_stations, 'route:8'), now);
  assert.match(first.summary, /Jaipur/); assert.doesNotMatch(first.summary, /Ajmer/);
  assert.equal(second.summary, next.arrival_explanation.summary);
  assert.equal(first.method, 'delay_adjusted'); assert.equal(second.method, 'inference');
});

test('repeated station codes require an unambiguous sequence', () => {
  const { prediction } = journey();
  const repeated = { ...prediction, route_sequence: 15 };
  assert.equal(reasons.selectedPrediction([prediction, repeated], 'JP'), undefined);
  assert.equal(reasons.selectedPrediction([prediction, repeated], 'route:15'), repeated);
  const old = { ...prediction, route_sequence: undefined };
  assert.equal(reasons.selectedPrediction([old, old], 'JP'), undefined);
});

test('a global model label never claims an individual unsupported stop used ML', () => {
  const { eta, status, prediction } = journey({ prediction_method: undefined }); eta.prediction_method = 'inference';
  const view = reasons.stationArrival(eta, status, prediction, now);
  assert.equal(view.predictedArrival, null); assert.equal(view.basis, 'Scheduled time only');
});

test('stale, cached, missing and future observations cannot present a fresh cause or prediction', () => {
  for (const observation of [timestamp(-6), timestamp(1), undefined, '12:00']) {
    const { eta, status, prediction } = journey(); eta.observation_timestamp = observation; status.last_known_location.updated_at = observation;
    prediction.arrival_explanation = { status: 'delayed', title: 'Signal failure', summary: 'Old signal explanation', details: [] };
    const view = reasons.stationArrival(eta, status, prediction, now);
    assert.equal(view.predictedArrival, null); assert.equal(view.stale, true); assert.doesNotMatch(view.summary, /signal/);
  }
  const { eta, status, prediction } = journey(); eta.data_source = 'cached';
  assert.equal(reasons.stationArrival(eta, status, prediction, now).predictedArrival, null);
});

test('unknown journey status, past forecast and mismatched journey cannot become an ETA', () => {
  const unknown = journey(); unknown.status.status = 'unknown';
  assert.equal(reasons.stationArrival(unknown.eta, unknown.status, unknown.prediction, now).predictedArrival, null);
  const past = journey({ predicted_arrival: timestamp(-2) });
  assert.equal(reasons.stationArrival(past.eta, past.status, past.prediction, now).predictedArrival, null);
  const wrong = journey(); wrong.eta.date = '2026-10-15';
  assert.equal(reasons.stationArrival(wrong.eta, wrong.status, wrong.prediction, now).predictedArrival, null);
});

test('not-started and cancelled journeys never show predicted times', () => {
  for (const [state, expected] of [['not-started', 'not_started'], ['cancelled', 'cancelled']]) {
    const { eta, status, prediction } = journey(); status.status = state;
    const view = reasons.stationArrival(eta, status, prediction, now);
    assert.equal(view.status, expected); assert.equal(view.predictedArrival, null); assert.match(view.summary, /Jaipur/);
  }
});

test('cached not-started and cancelled reports remain clear without becoming fresh forecasts', () => {
  for (const [state, expected] of [['not-started', 'not_started'], ['cancelled', 'cancelled']]) {
    for (const hasExplanation of [true, false]) {
      const { eta, status, prediction } = journey();
      eta.data_source = status.data_source = 'cached'; status.status = state;
      if (hasExplanation) prediction.arrival_explanation = { status: expected,
        title: expected === 'not_started' ? 'Journey not started' : 'Journey cancelled',
        summary: expected === 'not_started' ? 'The train has not left its first station. Its scheduled Jaipur arrival is 18:30 IST.' : 'This journey is cancelled, so the train will not arrive at Jaipur.',
        details: ['Check the latest available journey status before travelling.'] };
      const view = reasons.stationArrival(eta, status, prediction, now);
      assert.equal(view.status, expected); assert.equal(view.stale, true);
      assert.match(view.title, /^Latest report:/); assert.match(view.summary, /^The latest available update says:/);
      assert.match(view.summary, /Jaipur/); assert.match(view.basis, /Scheduled time only/);
      assert.equal(view.method, 'schedule_only'); assert.equal(view.predictedArrival, null);
    }
  }
});

test('a cancelled route stop is explained even when the journey is running', () => {
  const { eta, status, prediction } = journey();
  prediction.arrival_explanation = { status: 'cancelled', title: 'No arrival at Jaipur',
    summary: 'The latest route report marks the Jaipur stop as cancelled.', details: ['No arrival estimate is shown for this stop.'] };
  const view = reasons.stationArrival(eta, status, prediction, now);
  assert.equal(view.status, 'cancelled'); assert.equal(view.summary, prediction.arrival_explanation.summary);
  assert.equal(view.predictedArrival, null); assert.equal(view.method, 'schedule_only');
});

test('station-specific unavailable reason is preserved on live and cached reports', () => {
  for (const source of ['live', 'cached']) {
    const { eta, status, prediction } = journey(); eta.data_source = source;
    prediction.arrival_explanation = { status: 'unavailable', title: 'Jaipur timing needs confirmation',
      summary: 'The reported Jaipur arrival has already passed, but no arrival was confirmed.', details: ['The scheduled Jaipur arrival remains available.'] };
    const view = reasons.stationArrival(eta, status, prediction, now);
    assert.equal(view.status, 'unavailable'); assert.match(view.summary, /reported Jaipur arrival has already passed/);
    assert.deepEqual(view.details, prediction.arrival_explanation.details);
    assert.equal(view.predictedArrival, null); assert.equal(view.method, 'schedule_only');
    if (source === 'cached') assert.match(view.summary, /^The latest available update says:/);
  }
});

test('cached skipped stop remains a qualified report and never replays the supplied positive ETA', () => {
  const { eta, status, prediction } = journey(); eta.data_source = 'cached';
  prediction.arrival_explanation = { status: 'skipped', title: 'Jaipur stop skipped', summary: 'The route report says the train will skip Jaipur.', details: [] };
  const view = reasons.stationArrival(eta, status, prediction, now);
  assert.equal(view.status, 'skipped'); assert.match(view.summary, /^The latest available update says:/);
  assert.equal(view.predictedArrival, null); assert.equal(view.delayMinutes, null);
});

test('confirmed recorded arrivals remain available on cached data, future actual fields do not', () => {
  const { eta, status, prediction } = journey({ actual_arrival: timestamp(-5), scheduled_arrival: timestamp(-10) });
  eta.data_source = 'cached';
  const view = reasons.stationArrival(eta, status, prediction, now);
  assert.equal(view.status, 'arrived'); assert.equal(view.delayMinutes, 5); assert.match(view.summary, /arrived at Jaipur/);
  prediction.actual_arrival = timestamp(30);
  assert.equal(reasons.stationArrival(eta, status, prediction, now).actualArrival, null);
});

test('legacy route actual fields do not turn a future stop into a recorded arrival', () => {
  const { eta, status, prediction } = journey();
  status.route = [{ station: prediction.station, actual_arrival: timestamp(-5), actual_departure: timestamp(-4), has_departed: true }];
  assert.equal(reasons.stationArrival(eta, status, prediction, now).actualArrival, null);
  assert.equal(reasons.confirmedStopTime(status.route[0], 'arrival', timestamp(-1), now), null);
  status.route[0].arrival_confirmed = true;
  assert.equal(reasons.confirmedStopTime(status.route[0], 'arrival', timestamp(-1), now), timestamp(-5));
});

test('rendered fallback explanation hides model scores and technical model status', () => {
  const liveNow = Date.now();
  const { eta, status, prediction } = journey();
  const shift = value => new Date(Date.parse(value) + liveNow - now).toISOString();
  eta.observation_timestamp = status.last_known_location.updated_at = shift(timestamp(-1));
  prediction.scheduled_arrival = shift(prediction.scheduled_arrival); prediction.predicted_arrival = shift(prediction.predicted_arrival);
  const html = renderToStaticMarkup(React.createElement(PassengerJourney, { number: '12345', suppliedJourney: { eta, status } }));
  assert.match(html, /Why this arrival time/); assert.match(html, /20 min late at Jaipur/);
  assert.match(html, /Based on the latest running update/);
  assert.doesNotMatch(html, /15\.4|27\.2|229|eta-gbr|Model status|Generic signal failure|Learn about common delay causes/);
});

test('rendering a selected model stop uses its own explanation and optional model details', () => {
  const liveNow = Date.now(); const { eta, status, prediction } = journey();
  const shift = value => new Date(Date.parse(value) + liveNow - now).toISOString();
  eta.observation_timestamp = status.last_known_location.updated_at = shift(timestamp(-1));
  prediction.scheduled_arrival = shift(prediction.scheduled_arrival); prediction.predicted_arrival = shift(prediction.predicted_arrival);
  const next = { ...prediction, station: { code: 'AII', name: 'Ajmer' }, route_sequence: 8, prediction_method: 'inference',
    arrival_explanation: { status: 'delayed', title: '20 min late at Ajmer', summary: 'Station-specific arrival for Ajmer.', details: ['A verified station-specific detail.'] } };
  eta.remaining_stations.push(next); eta.prediction_method = 'inference';
  const html = renderToStaticMarkup(React.createElement(PassengerJourney, { number: '12345', target: 'AII', suppliedJourney: { eta, status } }));
  assert.match(html, /Station-specific arrival for Ajmer/); assert.match(html, /A verified station-specific detail/);
  assert.match(html, /past journeys/); assert.match(html, /15\.4/);
  assert.doesNotMatch(html, /20 min late at Jaipur/);
});
