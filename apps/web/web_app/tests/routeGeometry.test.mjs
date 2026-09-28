import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

async function moduleFor(lookup) {
  globalThis.fetch = async () => new Response('{}');
  globalThis.routeTestLookup = lookup;
  const source = readFileSync(new URL('../src/services/routeGeometry.ts', import.meta.url), 'utf8').replace("import { stationDetails, type Status } from './passenger';", 'const stationDetails = globalThis.routeTestLookup;');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js + '\n//' + Math.random()).toString('base64')}`);
}
const stop = (code, latitude, longitude) => ({ station: { code, name: code, latitude, longitude } });
const signal = () => new AbortController().signal;
test('rejects absent, nonnumeric and impossible coordinates', async () => {
  const api = await moduleFor(() => {});
  for (const value of [null, undefined, '', '28', NaN, Infinity, 91]) assert.equal(api.coordinates(value, 77), null);
  assert.deepEqual(api.coordinates(28, 77), { latitude: 28, longitude: 77 });
});
test('bundled geography resolves stops without station API requests', async () => {
  const api = await moduleFor(() => { throw Error('No station request expected'); });
  globalThis.fetch = async () => new Response(JSON.stringify({AA:[28,77],BB:[29,78]}));
  const points = await api.resolveRoute({route:[stop('AA',null,null),stop('BB',null,null)]},signal());
  assert.equal(points.length,2);
});
test('preserves repeated visits and avoids guessing their current occurrence', async () => {
  const api = await moduleFor(() => { throw Error('No lookup expected'); });
  const points = await api.resolveRoute({ route: [stop('AA',28,77), stop('BB',29,78), stop('AA',28,77)], current_station: {code:'AA'} }, signal());
  assert.deepEqual(points.map(p => p.code), ['AA', 'BB', 'AA']);
  assert.equal(points.some(p => p.current), false);
});
test('bounds concurrency, reuses successful geography and retries failures', async () => {
  let active = 0, peak = 0, calls = 0, fail = true;
  const api = await moduleFor(async code => {
    calls++; active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    if (code === 'S0' && fail) throw Error('Temporary failure');
    return { latitude: 28, longitude: 77 };
  });
  const status = { route: Array.from({length:10}, (_,i) => stop('S'+i,null,null)) };
  const first = await api.resolveRoute(status, signal());
  assert.equal(first.length, 9); assert.ok(peak <= 4); assert.equal(calls,10);
  fail = false;
  assert.equal((await api.resolveRoute(status, signal())).length, 9);
  assert.equal(calls,10);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 300001;
  try {
    const second = await api.resolveRoute(status, signal());
    assert.equal(second.length, 10); assert.equal(calls,11);
  } finally { Date.now = originalNow; }
});
test('missing geography retains sequence gaps and cancellation stops new lookups', async () => {
  let calls = 0;
  const api = await moduleFor(async () => { calls++; throw Error('No geography'); });
  const status = { route: [stop('AA',28,77),stop('BB',null,null),stop('CC',29,78)] };
  assert.deepEqual((await api.resolveRoute(status,signal())).map(p=>p.sequence),[0,2]);
  const controller = new AbortController(); controller.abort();
  await api.resolveRoute(status,controller.signal);
  assert.equal(calls,1);
});
