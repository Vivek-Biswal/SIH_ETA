import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function evaluate(path, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => imports[name] ?? require(name), module, module.exports);
  return module.exports;
}
const model = evaluate('../src/services/journeyWorkspace.ts');

test('unknown, absent and invalid journey modes safely open train tracking', () => {
  for (const value of [null, undefined, '', 'live', 'unknown', 'constructor', 'https://other.example']) assert.equal(model.parseJourneyMode(value), 'live');
  for (const value of ['history', 'simulation', 'analytics']) assert.equal(model.parseJourneyMode(value), value);
});

test('app mode selection creates WebView history, restores Back and informs native navigation', () => {
  const originalWindow = globalThis.window;
  const handlers = new Map(), effects = [], entries = [], notifications = [], themes = [];
  let selected = 'live';
  globalThis.window = {
    location: { href: 'https://equinox01.vercel.app/journey-insights?embed=mobile&theme=dark' },
    history: { state: { next: true }, pushState(state, _, url) { entries.push({ state, url: String(url) }); globalThis.window.location.href = String(url); } },
    addEventListener(name, handler) { handlers.set(name, handler); },
    removeEventListener(name) { handlers.delete(name); },
    JourneyNavigation: { postMessage(value) { notifications.push(value); } },
  };
  try {
    const { MobileJourneyWorkspace } = evaluate('../src/components/network/MobileJourneyWorkspace.tsx', {
      react: { ...React, useState: () => [selected, value => { selected = value; }], useEffect: effect => { effects.push(effect); } },
      'next-themes': { useTheme: () => ({ setTheme: value => themes.push(value) }) },
      './NetworkWorkspace': { NetworkWorkspace: () => null },
      '@/services/journeyWorkspace': model,
    });
    const tree = MobileJourneyWorkspace({ theme: 'dark' });
    const cleanup = effects.map(effect => effect());
    assert.deepEqual(themes, ['dark']);
    tree.props.onModeChange('live');
    assert.equal(entries.length, 0, 'selecting the active tool must not create extra Back steps');
    tree.props.onModeChange('simulation');
    assert.equal(selected, 'simulation');
    assert.equal(entries.length, 1);
    assert.match(entries[0].url, /embed=mobile&theme=dark&mode=simulation/);
    assert.deepEqual(entries[0].state, { next: true });
    assert.equal(tree.props.embedded, true);
    globalThis.window.location.href = 'https://equinox01.vercel.app/journey-insights?embed=mobile&theme=dark';
    handlers.get('popstate')();
    assert.equal(selected, 'live');
    assert.deepEqual(notifications, ['changed', 'changed', 'changed']);
    handlers.get('journey-theme')({ detail: 'light' });
    handlers.get('journey-theme')({ detail: 'invalid' });
    assert.deepEqual(themes, ['dark', 'light']);
    cleanup.forEach(dispose => dispose?.());
    assert.equal(handlers.size, 0);
  } finally { globalThis.window = originalWindow; }
});
