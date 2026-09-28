'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { loadJourney, type Status } from '@/services/passenger';
import { resolveRoute, type RoutePoint } from '@/services/routeGeometry';
import { simulationStops, simulationPosition, arrivalMinute, type ScenarioStop, type Disruption } from '@/services/journeySimulation';

const Map = dynamic(() => import('./JourneySimulationMap'), { ssr: false, loading: () => <p>Loading geographic map…</p> });
const cache = new globalThis.Map<string, { status: Status; stops: ScenarioStop[]; points: RoutePoint[]; expires: number }>();
const button = 'rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-40';
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`;
export function RouteSimulation() {
  const [number, setNumber] = useState('');
  const [date, setDate] = useState('');
  const [data, setData] = useState<Omit<NonNullable<ReturnType<typeof cache.get>>, 'expires'> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [section, setSection] = useState(0);
  const [sectionSearch, setSectionSearch] = useState('');
  const [minutes, setMinutes] = useState(15);
  const [event, setEvent] = useState<Disruption | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const pause = () => setRunning(false);
    window.addEventListener('journey-pause', pause);
    return () => window.removeEventListener('journey-pause', pause);
  }, []);
  const stops = data?.stops || [];
  const end = stops.length ? arrivalMinute(stops[stops.length - 1], event) : 0;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setElapsed(v => Math.min(end, v + speed * .25)); }, 250);
    return () => clearInterval(timer);
  }, [running, speed, end]);
  useEffect(() => { if (end > 0 && elapsed >= end) setRunning(false); }, [elapsed, end]);
  function reset() { setRunning(false); setElapsed(0); setEvent(null); }
  async function load() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    reset(); setData(null); setError(''); setLoading(true);
    try {
      const key = number + ':' + date;
      let result = cache.get(key);
      if (!result || result.expires < Date.now()) {
        const journey = await loadJourney(number, date, controller.signal, false);
        if (!journey.status) throw new Error(journey.statusError || 'Route unavailable.');
        const stops = simulationStops(journey.status.route);
        if (stops.length < 2 || stops.at(-1)!.minute <= 0) throw new Error('This train has no usable ordered timetable.');
        const points = await resolveRoute(journey.status, controller.signal);
        result = { status: journey.status, stops, points, expires: Date.now() + 300000 };
        if (!controller.signal.aborted) { if (cache.size >= 10) cache.delete(cache.keys().next().value!); cache.set(key, result); }
      }
      if (!controller.signal.aborted) { setData(result); setSection(0); setSectionSearch(''); }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load the route.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  const position = stops.length ? simulationPosition(stops, elapsed, event) : null;
  const extra = event ? event.minutes - event.recovered : 0;
  return <section className="space-y-5">
    <header><p className="text-xs font-semibold text-amber-600">SIMULATION · NOT LIVE RUNNING STATUS</p><h2 className="mt-2 text-2xl font-semibold">What happens if my train is delayed?</h2><p className="mt-2 text-sm text-muted-foreground">Load a train’s full reported route, choose a section and explore how extra waiting time affects later stops.</p></header>
    <form onSubmit={e => { e.preventDefault(); void load(); }} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-5">
      <label className="flex-1 text-sm">Train number<input required pattern="[0-9]{5}" maxLength={5} inputMode="numeric" value={number} onChange={e => setNumber(e.target.value)} placeholder="12423" className="mt-2 block w-full rounded-lg border bg-background p-3" /></label>
      <label className="flex-1 text-sm">Journey start date (optional)<input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-2 block w-full rounded-lg border bg-background p-3" /></label>
      <button disabled={loading} className={`${button} bg-primary text-primary-foreground`}>{loading ? 'Loading route…' : 'Load route'}</button>
    </form>
    {error && <p role="alert" className="rounded-xl bg-amber-500/10 p-4">{error}</p>}
    {data && position && <>
      <div className="rounded-2xl border bg-card p-5"><h3 className="text-xl font-semibold">{data.status.train_number} · {data.status.train_name}</h3><p className="mt-2">{stops[0].name} → {stops.at(-1)!.name}</p><p className="mt-2 text-sm text-muted-foreground">Route dated {data.status.date} · {stops.length} reported route points, including passing stations · {data.points.length} mapped. The simulation starts at the origin, independently of the train’s real position.</p></div>
      <div className="h-[460px] overflow-hidden rounded-2xl border"><Map points={data.points} index={position.index} progress={position.progress} affected={event?.section} /></div>
      <p className="text-xs text-muted-foreground">The entire selected route is shown. Dashed lines are approximate station connections, not railway track geometry. Missing coordinates leave gaps; all reported stops remain in the table.</p>
      <div className="flex items-center gap-4"><progress aria-label="Journey progress" className="h-2 flex-1 accent-blue-600" max={end} value={elapsed} /><button className={button} disabled={position.arrived} onClick={() => { setRunning(false); setElapsed(arrivalMinute(stops[position.index + 1], event)); }}>Skip to next station</button></div>
      <label className="block text-sm">Find a route section<input disabled={Boolean(event)} value={sectionSearch} onChange={e => setSectionSearch(e.target.value)} placeholder="Station name or code" className="mt-2 block w-full rounded-lg border bg-background p-3" /></label>
      <div className="flex flex-wrap items-center gap-3"><button disabled={position.arrived} onClick={() => setRunning(v => !v)} className={`${button} bg-primary text-primary-foreground`}>{running ? 'Pause' : 'Start / resume'}</button><button onClick={reset} className={button}>Reset scenario</button>{[1, 2, 4].map(s => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)} className={`${button} ${speed === s ? 'bg-primary/10' : ''}`}>{s}×</button>)}<span className="text-xs text-muted-foreground">1× = 1 journey minute per real second · pauses when hidden</span></div>
      <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2"><label className="text-sm">Affected section<select disabled={Boolean(event)} value={section} onChange={e => setSection(Number(e.target.value))} className="mt-2 w-full rounded-lg border bg-background p-3">{stops.slice(0, -1).map((s, i) => (i === section || `${s.name} ${s.code} ${stops[i + 1].name} ${stops[i + 1].code}`.toLowerCase().includes(sectionSearch.toLowerCase())) && <option key={i} value={i}>{i + 1}. {s.name} → {stops[i + 1].name}</option>)}</select></label><label className="text-sm">Extra waiting time (minutes)<input disabled={Boolean(event)} type="number" min={1} max={120} value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="mt-2 w-full rounded-lg border bg-background p-3" /></label><button disabled={Boolean(event) || elapsed > stops[section].minute || !Number.isFinite(minutes) || minutes < 1 || minutes > 120} onClick={() => setEvent({ section, minutes, recovered: 0 })} className={button}>Add section delay</button><button disabled={!event || extra <= 0 || elapsed > stops[event.section].minute} onClick={() => { if (event) setEvent({ ...event, recovered: Math.min(event.minutes, event.recovered + 5) }); }} className={button}>Reduce planned wait by 5 min</button><p className="text-xs text-muted-foreground sm:col-span-2">Choose a section the train has not entered. Recovery changes the planned wait before entry; it cannot erase time already spent. Reset to try a different disruption.</p></div>
      <div aria-live="off" className="rounded-2xl bg-primary/10 p-5"><h3 className="font-semibold">{position.arrived ? 'Destination reached' : `Next: ${stops[position.index + 1].name}`}</h3><p className="mt-2">Elapsed: {duration(elapsed)} · Destination arrival: {duration(end)} after departure · Added delay: {extra} min</p><p className="mt-2 text-sm">{extra ? `This scenario carries ${extra} minutes of extra waiting to every stop after the affected section.` : 'No additional delay in this scenario.'}</p></div>
      <details className="rounded-2xl border bg-card p-4"><summary className="cursor-pointer font-semibold">All {stops.length} route stops and arrival changes</summary><div className="mt-4 max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Stop</th><th className="p-2">Timetable +min</th><th className="p-2">Scenario +min</th><th className="p-2">Extra wait</th></tr></thead><tbody>{stops.map(s => <tr key={s.sequence} className="border-t"><td className="p-2">{s.sequence + 1}. {s.name}</td><td className="p-2">{s.minute.toFixed(0)}</td><td className="p-2">{arrivalMinute(s, event).toFixed(0)}</td><td className="p-2">+{arrivalMinute(s, event) - s.minute} min</td></tr>)}</tbody></table></div></details>
      <p className="text-xs leading-5 text-muted-foreground">Model assumptions: timetable-based movement and an explicit section wait. No automatic recovery, signalling, track capacity or other train interactions are inferred. This what-if tool is not a validated ML forecast or an operational dispatch recommendation. Route loads are cached for five minutes; simulation playback makes no train API calls.</p>
    </>}
  </section>;
}
