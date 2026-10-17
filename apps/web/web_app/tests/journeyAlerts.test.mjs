import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function evaluate(path, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => imports[name] ?? require(name), module, module.exports);
  return module.exports;
}
const passenger = evaluate('../src/services/passenger.ts');
const reasons = evaluate('../src/services/etaReason.ts');
const { buildAlerts, comparison, parsePreferences, watchView, journeyLink } = evaluate('../src/services/journeyAlerts.ts', { './passenger': passenger, './etaReason': reasons });
const now = Date.parse('2026-10-17T10:00:00Z');
const stamp = minutes => new Date(now + minutes * 60000).toISOString();
const watch = { id: 'watch-one', number: '12423', date: '2026-10-17', station: 'route:2', threshold: 15 };
function sample(overrides = {}) {
  const predictions = [
    { station: { code: 'JP', name: 'Jaipur' }, route_sequence: 2, scheduled_arrival: stamp(60), predicted_arrival: stamp(80), prediction_method: 'delay_adjusted' },
    { station: { code: 'AWR', name: 'Alwar' }, route_sequence: 3, scheduled_arrival: stamp(120), predicted_arrival: stamp(125), prediction_method: 'delay_adjusted' },
  ];
  const status = { train_number: '12423', train_name: 'Test fixture', date: watch.date, data_source: 'live', status: 'running',
    last_known_location: { updated_at: stamp(-1), delay_minutes: 20 }, current_station: { code: 'RE', name: 'Rewari' },
    route: predictions.map(p => ({ station: p.station, route_sequence: p.route_sequence, scheduled_arrival: p.scheduled_arrival, scheduled_departure: stamp(130) })) };
  const eta = { train_number: '12423', date: watch.date, data_source: 'live', prediction_method: 'delay_adjusted', observation_timestamp: stamp(-1), remaining_stations: predictions };
  return { journey: { status, eta }, checkedAt: now, error: '', ...overrides };
}

test('alerts use the selected station and threshold rather than historical bottleneck scores', () => {
  const check = sample();
  const alerts = buildAlerts(watch, check, now);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].title, /20 min late at Jaipur/);
  assert.match(alerts[0].message, /Jaipur/);
  assert.equal(alerts[0].observed, stamp(-1));
  assert.equal(alerts[0].station, 'route:2', 'deep links preserve repeated-stop identity');
  assert.equal(buildAlerts({ ...watch, station: 'route:3' }, check, now).length, 0);
  assert.equal(buildAlerts({ ...watch, threshold: 30 }, check, now).length, 0);
  assert.ok(!JSON.stringify(alerts).match(/signal failure|trains affected|Bottleneck Score/));
});

test('cached, old, future, failed and mismatched reports cannot generate current alerts', () => {
  for (const mutate of [
    c => c.journey.status.data_source = 'cached',
    c => c.journey.status.data_source = 'mock',
    c => c.journey.status.last_known_location.updated_at = stamp(-6),
    c => c.journey.status.last_known_location.updated_at = stamp(1),
    c => c.journey.status.last_known_location.updated_at = '12:00',
    c => c.journey.status.train_number = '12303',
    c => c.journey.status.date = '2026-10-16',
    c => c.error = 'Request failed',
  ]) {
    const c = sample(); mutate(c); assert.deepEqual(buildAlerts(watch, c, now), []);
  }
  assert.deepEqual(buildAlerts(watch, undefined, now), []);
});

test('cancelled journeys are explicit service reports, not positive ETA predictions', () => {
  const c = sample(); c.journey.status.status = 'cancelled';
  const list = buildAlerts(watch, c, now);
  assert.equal(list.length, 1); assert.equal(list[0].kind, 'service');
  assert.match(list[0].title, /cancelled/);
});

test('arrival changes require a newer observation for the same dated journey and route occurrence', () => {
  const older = sample(); older.journey.status.last_known_location.updated_at = stamp(-3); older.journey.eta.observation_timestamp = stamp(-3);
  older.journey.eta.remaining_stations[0].predicted_arrival = stamp(70);
  const previous = comparison(watch, older);
  const c = sample({ previous });
  assert.match(buildAlerts(watch, c, now).find(a => a.kind === 'changed').title, /10 min later/);
  for (const change of [{ station: 'route:3' }, { date: '2026-10-16' }, { observed: now }, { expected: 'invalid' }]) {
    c.previous = { ...previous, ...change };
    assert.ok(!buildAlerts(watch, c, now).some(a => a.kind === 'changed'));
  }
});

test('near-arrival information is an estimate and repeated checks retain stable IDs', () => {
  const c = sample();
  Object.assign(c.journey.eta.remaining_stations[0], { scheduled_arrival: stamp(20), predicted_arrival: stamp(20) });
  const first = buildAlerts(watch, c, now);
  assert.equal(first.length, 1); assert.equal(first[0].kind, 'arrival');
  assert.match(first[0].title, /20 min/); assert.match(first[0].details.join(' '), /estimate/);
  c.journey.status.last_known_location.updated_at = stamp(0);
  assert.equal(buildAlerts(watch, c, now)[0].id, first[0].id);
});

test('duplicate station visits without unique sequences cannot select a misleading arrival', () => {
  const c = sample();
  c.journey.eta.remaining_stations = [c.journey.eta.remaining_stations[0], { ...c.journey.eta.remaining_stations[0] }];
  assert.equal(watchView(watch, c, now).prediction, undefined);
  assert.ok(buildAlerts(watch, c, now).every(a => !a.title.includes('at Jaipur')));
});

test('saved settings are bounded, sanitized and deduplicated without persisting provider payloads', () => {
  assert.deepEqual(parsePreferences(null), { watches: [], read: [] });
  assert.throws(() => parsePreferences('{bad json'));
  assert.throws(() => parsePreferences('{"version":99}'));
  const parsed = parsePreferences(JSON.stringify({ version: 1, watches: [watch, watch, { ...watch, id: 'bad', number: '<script>' }], read: ['good', 7, 'x'.repeat(301)] }));
  assert.equal(parsed.watches.length, 1); assert.deepEqual(parsed.read, ['good']);
  const invalidDate = parsePreferences(JSON.stringify({ version: 1, watches: [{ ...watch, date: '2026-02-30' }], read: [] }));
  assert.equal(invalidDate.watches.length, 0);
  assert.equal(journeyLink('12423', watch.date, 'JP'), '/trains/12423/eta?date=2026-10-17&station=JP');
});

test('alerts can skip the ETA request after status failure without changing other clients', async () => {
  let calls = 0; const old = global.fetch;
  global.fetch = async () => { calls++; return { ok: false, status: 503 }; };
  try {
    const result = await passenger.loadJourney('12423', watch.date, undefined, true, { requireStatusForETA: true });
    assert.equal(calls, 1); assert.equal(result.status, null); assert.equal(result.eta, null);
  } finally { global.fetch = old; }
});
