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

test('app presentation has one compact mode selector and a clear heading for each tool', () => {
  const headings = { live: 'Find your train', history: 'Understand past delays', simulation: 'Explore a what-if journey', analytics: 'Your journey in numbers' };
  for (const [activeMode, heading] of Object.entries(headings)) {
    const html = render({ embedded: true, activeMode });
    assert.match(html, /class="[^"]*embedded/);
    assert.equal((html.match(/<nav /g) || []).length, 1);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    assert.ok(html.includes(`<h1>${heading}</h1>`));
    assert.doesNotMatch(html, /class="hero"|Your journey, made clearer/);
    for (const title of ['Track my train', 'Analytics', 'Past delays', 'Simulation']) assert.ok(html.includes(title));
    for (const id of ['live', 'history', 'simulation', 'analytics']) assert.ok(html.includes(`data-journey-mode="${id}"`));
  }
  assert.match(render({ embedded: true, activeMode: 'simulation' }), /Simulation · not live/);
});

test('embedded Back reuses visited Activity boundaries while hidden maps and effects stay inactive', () => {
  let saved;
  const activityModule = { exports: {} };
  const panelImports = { ...imports, react: { ...React, useState: initial => { saved ??= initial; return [saved, next => { saved = next; }]; } } };
  new Function('require', 'module', 'exports', code)(name => panelImports[name] ?? require(name), activityModule, activityModule.exports);
  const panels = mode => activityModule.exports.EmbeddedJourneyPanels({ mode });
  const toolProps = boundary => boundary.props.children.props.children.props;
  const first = panels('live');
  assert.deepEqual(first.map(item => item.key), ['live'], 'unvisited tools must not mount or request data');
  assert.equal(first[0].type, React.Activity);
  assert.equal(first[0].props.mode, 'visible');
  const next = panels('simulation');
  assert.deepEqual(next.map(item => item.key), ['live', 'simulation']);
  assert.equal(next[0].key, first[0].key, 'a stable boundary retains tracking form and train state');
  assert.equal(next[0].props.mode, 'hidden');
  assert.equal(toolProps(next[0]).active, false, 'a hidden Leaflet subtree must not remain active');
  assert.equal(toolProps(next[1]).mapRevision, 1);
  const back = panels('live');
  assert.deepEqual(back.map(item => item.key), ['live', 'simulation']);
  assert.equal(back[0].props.mode, 'visible');
  assert.equal(back[1].props.mode, 'hidden');
  assert.equal(toolProps(back[0]).mapRevision, 2, 'returning maps recreate removed Leaflet instances');
  assert.equal(toolProps(back[1]).active, false, 'simulation playback remains inactive when hidden');
});
