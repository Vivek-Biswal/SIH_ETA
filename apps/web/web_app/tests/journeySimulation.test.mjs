import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/services/journeySimulation.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { simulationStops, simulationPosition, arrivalMinute } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const stop = (code, time) => ({ station: { code, name: code }, scheduled_arrival: time });
test('keeps repeated visits and midnight rollovers across the full route', () => {
  const stops = simulationStops([stop('A','23:00'),stop('B','00:30'),stop('A','02:00')]);
  assert.deepEqual(stops.map(s => s.minute), [0,90,180]);
  assert.deepEqual(stops.map(s => s.code), ['A','B','A']);
});
test('dated multi-day routes retain elapsed time', () => {
  assert.equal(simulationStops([stop('A','2026-09-28T12:00:00+05:30'),stop('B','2026-09-30T13:00:00+05:30')])[1].minute,2940);
});
test('rejects missing or invalid timetable instead of inventing movement', () => {
  for (const value of [null,'garbage','25:30','12:30:99','12']) assert.throws(() => simulationStops([stop('A',value)]));
  assert.throws(() => simulationStops([stop('A','2026-09-28T12:00:00+05:30'),stop('B','13:00')]));
});
test('delay carries forward once and recovery is subtracted once', () => {
  const stops = simulationStops([stop('A','10:00'),stop('B','11:00'),stop('C','12:00')]);
  const event = { section:0,minutes:20,recovered:5 };
  assert.deepEqual(stops.map(s => arrivalMinute(s,event)),[0,75,135]);
  assert.deepEqual(simulationPosition(stops,135,event),{index:2,progress:1,arrived:true});
  assert.equal(simulationPosition(stops,60,event).index,0);
  assert.equal(simulationPosition(stops,10,event).progress,0);
  assert.equal(simulationPosition(stops,75,event).index,1);
});
test('arrival never loops back and later disruptions leave earlier stops unchanged', () => {
  const stops = simulationStops([stop('A','10:00'),stop('B','11:00'),stop('C','12:00')]);
  assert.deepEqual(stops.map(s => arrivalMinute(s,{section:1,minutes:30,recovered:0})),[0,60,150]);
  assert.deepEqual(simulationPosition(stops,10000,null),{index:2,progress:1,arrived:true});
});
