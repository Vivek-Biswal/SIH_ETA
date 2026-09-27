import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/services/networkInsights.ts', import.meta.url), 'utf8').replace("import { PASSENGER_API } from './passenger';", "const PASSENGER_API = 'https://example.test/api/v1';");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { loadInsights } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });
const empty = { data_source: 'historical', station_count: 0, interaction_count: 0, high_risk_count: 0, stations: [], interactions: [] };
test('network query is encoded and legitimate empty results are retained', async () => {
  globalThis.fetch = async url => { assert.match(url, /q=NDLS&limit=50$/); return Response.json(empty); };
  assert.equal((await loadInsights('NDLS', new AbortController().signal)).station_count, 0);
});
test('mock data and incomplete numeric records are rejected', async () => {
  for (const payload of [{ ...empty, data_source: 'mock' }, { ...empty, stations: [{ station: 'NDLS' }] }]) {
    globalThis.fetch = async () => Response.json(payload);
    await assert.rejects(loadInsights('', new AbortController().signal));
  }
});
test('backend failure cannot turn into a healthy empty network', async () => {
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(loadInsights('', new AbortController().signal), /unavailable/);
});
