import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/services/mapStyle.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { validateMapStyle } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const original = globalThis.fetch;
afterEach(() => { globalThis.fetch = original; });
test('rejected credentials never mount warning image tiles', async () => {
  globalThis.fetch = async () => new Response('Forbidden', { status: 403 });
  await assert.rejects(validateMapStyle('test-key', 'hybrid-v4', new AbortController().signal), /rejected/);
});
test('satellite layer validates before returning its tile URL', async () => {
  globalThis.fetch = async url => { assert.match(url, /hybrid-v4\/256\/tiles.json/); return Response.json({ tiles: ['https://api.maptiler.com/tile'] }); };
  assert.match(await validateMapStyle('test-key', 'hybrid-v4', new AbortController().signal), /hybrid-v4\/256\/\{z\}/);
});
test('invalid metadata cannot produce a tile layer', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Invalid key' });
  await assert.rejects(validateMapStyle('test-key', 'hybrid-v4', new AbortController().signal), /invalid layer/);
});
