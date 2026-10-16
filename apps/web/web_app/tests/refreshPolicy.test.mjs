import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL('../src/components/network/LiveNetwork.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test('live tracking respects manual, five-minute and hidden-page policies', async () => {
  const original = { window: globalThis.window, document: globalThis.document, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval, now: Date.now };
  try {
    for (const interval of [0, 120000, 300000]) {
      let stateIndex = 0, now = 1000000, calls = 0;
      const effects = [], refs = [], timers = [];
      globalThis.window = new EventTarget();
      globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
      globalThis.setInterval = fn => { timers.push(fn); return timers.length; };
      globalThis.clearInterval = () => {};
      Date.now = () => now;
      const imports = {
        react: { useState: value => [stateIndex++ === 2 ? { number: '12345', date: '2026-10-16' } : typeof value === 'function' ? value() : value, () => {}],
          useRef: value => { const ref = { current: value }; refs.push(ref); return ref; }, useEffect: fn => effects.push(fn) },
        '@/services/preferences': { useLiveRefresh: () => interval, refreshDescription: () => '' },
        '@/services/passenger': { loadJourney: async () => { calls++; return { status: { date: '2026-10-16', route: [] } }; }, validDate: () => true },
        '@/services/routeGeometry': {}, './MapWrapper': {}, '@/components/eta/PassengerJourney': {},
      };
      const module = { exports: {} };
      new Function('require', 'module', 'exports', code)(name => imports[name] ?? require(name), module, module.exports);
      module.exports.LiveNetwork();
      const cleanups = effects.map(fn => fn());
      await Promise.resolve(); await Promise.resolve();
      assert.equal(calls, 1, 'selecting a train always loads it once');
      now += 120000; timers.forEach(fn => fn()); await Promise.resolve();
      assert.equal(calls, interval === 120000 ? 2 : 1);
      now += 300000; document.visibilityState = 'hidden'; timers.forEach(fn => fn()); await Promise.resolve();
      assert.equal(calls, interval === 120000 ? 2 : 1, 'hidden pages do not fetch');
      document.visibilityState = 'visible'; timers.forEach(fn => fn()); await Promise.resolve();
      assert.equal(calls, interval === 0 ? 1 : interval === 120000 ? 3 : 2);
      refs[1].current(); await Promise.resolve();
      assert.equal(calls, interval === 0 ? 2 : interval === 120000 ? 4 : 3, 'manual refresh remains available');
      // Switching the live preference does not recreate the selected journey.
      refs[0].current = 0;
      now += 600000; timers.forEach(fn => fn()); await Promise.resolve();
      assert.equal(calls, interval === 0 ? 2 : interval === 120000 ? 4 : 3);
      cleanups.forEach(fn => fn?.());
    }
  } finally {
    Date.now = original.now;
    globalThis.setInterval = original.setInterval; globalThis.clearInterval = original.clearInterval;
    if (original.window === undefined) delete globalThis.window; else globalThis.window = original.window;
    if (original.document === undefined) delete globalThis.document; else globalThis.document = original.document;
  }
});
