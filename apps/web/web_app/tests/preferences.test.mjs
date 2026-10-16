import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL('../src/services/preferences.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', code)(require, module, module.exports);
const { parseRefreshInterval, saveLiveRefresh, REFRESH_KEY, refreshDescription } = module.exports;

test('only supported safe intervals survive invalid or old browser data', () => {
  for (const value of [null, '', '10000', '-1', 'NaN', '{}', 'true']) assert.equal(parseRefreshInterval(value), 120000);
  assert.equal(parseRefreshInterval('0'), 0);
  assert.equal(parseRefreshInterval('300000'), 300000);
});

test('update settings persist and notify other mounted screens without removing unrelated data', () => {
  const store = new Map([['theme', 'dark'], ['sih_recent_searches', '[]']]);
  const events = [];
  globalThis.window = { localStorage: { setItem: (key, value) => store.set(key, value) }, dispatchEvent: event => events.push(event.type) };
  try {
    assert.equal(saveLiveRefresh(0), true);
    assert.equal(store.get(REFRESH_KEY), '0');
    assert.equal(store.get('theme'), 'dark');
    assert.equal(store.get('sih_recent_searches'), '[]');
    assert.deepEqual(events, ['etaernal-preferences-changed']);
    assert.match(refreshDescription(0), /off.*Refresh/);
    assert.match(refreshDescription(300000), /5 minutes/);
  } finally { delete globalThis.window; }
});

test('blocked storage reports failure instead of claiming to save', () => {
  globalThis.window = { localStorage: { setItem() { throw new Error('blocked'); } } };
  try { assert.equal(saveLiveRefresh(300000), false); }
  finally { delete globalThis.window; }
});
