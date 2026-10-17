import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const module = { exports: {} };
const code = ts.transpileModule(readFileSync(new URL('../src/components/network/NetworkWorkspace.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const imports = {
  react: { ...React, useEffect: () => {}, useState: value => [value, () => {}] },
  'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  'next/dynamic': { default: () => () => React.createElement('div', { 'data-screen': 'analytics' }) },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  './JourneyWorkspace.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
  '@/services/networkInsights': { loadInsights: () => { throw Error('render must not fetch'); } },
  './LiveNetwork': { LiveNetwork: () => React.createElement('div', { 'data-screen': 'tracking' }) },
  './RouteSimulation': { RouteSimulation: () => React.createElement('div', { 'data-screen': 'simulation' }) },
};
new Function('require', 'module', 'exports', code)(name => imports[name] ?? require(name), module, module.exports);
const render = props => renderToStaticMarkup(React.createElement(module.exports.NetworkWorkspace, props));

test('train tracking exposes only tracking and simulation, never historical or analytics content', () => {
  const html = render({ section: 'tracking' });
  assert.match(html, /Etaernal \/ Train Tracking/);
  assert.match(html, /Track my train/);
  assert.match(html, />Simulation</);
  assert.match(html, /data-screen="tracking"/);
  assert.doesNotMatch(html, />Past delays<|>Analytics<|Where delays tend to build/);
  assert.match(render({ section: 'tracking', initialMode: 'simulation' }), /data-screen="simulation"/);
  assert.match(render({ section: 'tracking', initialMode: 'history' }), /data-screen="tracking"/);
});

test('past-delay page always renders historical analysis without unrelated tabs or train tracking', () => {
  for (const initialMode of ['live', 'simulation', 'analytics', 'history']) {
    const html = render({ section: 'history', initialMode });
    assert.match(html, /Etaernal \/ Past Delay Insights/);
    assert.match(html, /Where delays tend to build/);
    assert.doesNotMatch(html, /<nav|data-screen=|>Track my train<|>Simulation<|>Analytics</);
  }
});

test('shared mobile workspace retains all four existing journey tools', () => {
  const html = render({});
  for (const title of ['Track my train', 'Analytics', 'Past delays', 'Simulation']) {
    assert.ok(html.includes(title), title);
  }
  assert.match(html, /Journey insights sections/);
});
