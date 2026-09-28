import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/services/journeyAnalytics.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {observations,summarize,exportCSV}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const now=Date.parse('2026-09-28T12:00:00Z');
const stop=(actual,departed=true)=>({station:{code:'AA',name:'Alpha'},scheduled_arrival:'2026-09-28T10:00:00Z',actual_arrival:actual,has_departed:departed});
test('missing, future and uncompleted records never become on-time observations',()=>{
 const rows=observations({route:[stop(null),stop('2026-09-28T13:00:00Z'),stop('2026-09-28T10:00:00Z',false),stop('10:00')]},now);
 assert.equal(summarize(rows).percentage,null); assert.equal(summarize(rows).average,null); assert.equal(summarize(rows).excluded,4);
});
test('all punctuality values use the same denominator and tolerance',()=>{
 const rows=observations({route:[stop('2026-09-28T09:55:00Z'),stop('2026-09-28T10:05:00Z'),stop('2026-09-28T10:10:00Z'),stop(null)]},now);
 const s=summarize(rows,5); assert.equal(s.measured,3); assert.equal(s.onTime,2); assert.equal(s.late,1); assert.equal(s.average,5); assert.equal(s.maximum,10); assert.ok(Math.abs(s.percentage-200/3)<1e-10);
 assert.equal(summarize(rows,0).onTime,1);
});
test('repeated station visits and overnight timezone differences remain distinct',()=>{
 const s=stop('2026-09-28T00:05:00+05:30'); s.scheduled_arrival='2026-09-27T23:55:00+05:30';
 const rows=observations({route:[s,s]},now); assert.equal(rows.length,2); assert.equal(rows[1].sequence,1); assert.equal(rows[0].delay,10);
});
test('CSV retains missing values and escapes formula-like station names',()=>{
 const rows=observations({route:[{...stop(null),station:{code:'AA',name:'=SUM(1,2)'}}]},now);
 const csv=exportCSV(rows,'12423','2026-09-28'); assert.ok(csv.includes('"\'=SUM(1,2)"')); assert.ok(csv.endsWith(',"",""'));
});
