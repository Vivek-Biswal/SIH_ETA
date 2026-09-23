import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/services/passenger.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const api = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const response = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

test('route query uses selected stations, page and date without timezone shifting', () => {
  const q = api.searchQuery(' ndls ', 'cnb', '2026-01-05', 2);
  assert.equal(q.get('from_station'), 'NDLS'); assert.equal(q.get('to_station'), 'CNB');
  assert.equal(q.get('date'), '2026-01-05'); assert.equal(q.get('page'), '2');
});
test('search without a date omits the date parameter', () => assert.equal(api.searchQuery('NDLS', 'CNB').has('date'), false));
test('invalid dates and identical stations are rejected', () => {
  for (const date of ['2026-1-5', '2026-02-30', 'invalid']) assert.throws(() => api.searchQuery('NDLS', 'CNB', date));
  assert.throws(() => api.searchQuery('NDLS', 'ndls'));
});
test('route search reads the trains envelope and selected route', async () => {
  globalThis.fetch = async url => { assert.match(url, /from_station=HWH&to_station=NDLS/); return response({ data_source: 'database', trains: [], total: 0, page: 1, limit: 20 }); };
  assert.deepEqual((await api.routeSearch('HWH', 'NDLS')).trains, []);
});
test('station search reads real directory results and encodes the query', async () => {
  globalThis.fetch = async url => { assert.match(url, /q=New\+Delhi/); return response({ data_source: 'database', results: [{ code: 'NDLS', name: 'New Delhi' }] }); };
  assert.equal((await api.stations('New Delhi'))[0].code, 'NDLS');
});
test('mock and malformed sources never become passenger data', async () => {
  globalThis.fetch = async () => response({ data_source: 'mock', trains: [], total: 5 });
  await assert.rejects(api.routeSearch('NDLS', 'CNB'));
  globalThis.fetch = async () => response({ data_source: 'live', trains: null });
  await assert.rejects(api.routeSearch('NDLS', 'CNB'));
});
test('journey pins ETA to status date and preserves real values', async () => {
  const calls = [];
  globalThis.fetch = async url => { calls.push(url); return response(url.includes('/status') ? { data_source: 'live', train_number: '12423', date: '2026-09-22', route: [] } : { data_source: 'live', train_number: '12423', date: '2026-09-22', remaining_stations: [] }); };
  const result = await api.loadJourney('12423');
  assert.ok(result.status); assert.ok(result.eta); assert.match(calls[1], /eta\?date=2026-09-22$/);
});
test('explicit journey date reaches both endpoints', async () => {
  globalThis.fetch = async url => { assert.match(url, /\?date=2026-09-24$/); return response({ data_source: 'live', train_number: '12423', date: '2026-09-24', route: [], remaining_stations: [] }); };
  assert.ok((await api.loadJourney('12423', '2026-09-24')).eta);
});
test('mismatched train or date is rejected', async () => {
  globalThis.fetch = async () => response({ data_source: 'live', train_number: '99999', date: '2026-09-22', route: [], remaining_stations: [] });
  const result = await api.loadJourney('12423', '2026-09-24');
  assert.equal(result.status, null); assert.equal(result.eta, null);
});
test('ETA failure preserves successful status', async () => {
  globalThis.fetch = async url => url.includes('/eta') ? new Response('', { status: 503 }) : response({ data_source: 'live', train_number: '12423', date: '2026-09-22', route: [] });
  const result = await api.loadJourney('12423'); assert.ok(result.status); assert.equal(result.eta, null); assert.ok(result.etaError);
});
test('number validation prevents network requests', async () => {
  globalThis.fetch = async () => assert.fail('Should not request');
  await assert.rejects(api.loadJourney('12ab3'));
});
test('only valid equal scheduled times identify intermediate stations', () => {
  assert.equal(api.passing({ scheduled_arrival: '10:00', scheduled_departure: '10:00:00' }), true);
  assert.equal(api.passing({ scheduled_arrival: null, scheduled_departure: null }), false);
  assert.equal(api.passing({ scheduled_arrival: '10:00', scheduled_departure: '10:05' }), false);
});
test('schedule-only response is not presented as an ETA', () => {
  assert.equal(api.usablePrediction({ prediction_method: 'schedule_only' }, { predicted_arrival: '2026-09-24T10:00:00+05:30' }), false);
  assert.equal(api.delayLabel(0), 'On schedule'); assert.equal(api.delayLabel(null), 'Difference unavailable');
  assert.equal(api.time(null), 'Unavailable'); assert.match(api.time('2026-09-24T00:00:00Z'), /05:30 IST/);
});
