'use client';
import { useEffect, useState } from 'react';
import { Clock3, RefreshCw, TrainFront, ChevronDown } from 'lucide-react';
import { delayLabel, loadJourney, passing, time, usablePrediction, type Journey, type Stop } from '@/services/passenger';

export function PassengerJourney({ number, date = '', target = '', compact = false }: { number: string; date?: string; target?: string; compact?: boolean }) {
  const [journey, setJourney] = useState<Journey | null>(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [revision, refresh] = useState(0);
  const [selected, select] = useState(target), [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setJourney(null); setError('');
    loadJourney(number, date, controller.signal).then(data => { if (!controller.signal.aborted) setJourney(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) { setLoading(false); setNow(Date.now()); } });
    return () => controller.abort();
  }, [number, date, revision]);
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); }, 30000);
    return () => clearInterval(timer);
  }, []);
  const status = journey?.status, eta = journey?.eta || null;
  const predictions = eta?.remaining_stations || [];
  const defaultPrediction = predictions.find(p => usablePrediction(eta, p)) || predictions.at(-1);
  const destination = selected || defaultPrediction?.station?.code || '';
  // Repeated station codes cannot safely be joined without a route sequence identifier.
  const matches = predictions.filter(p => p.station?.code === destination);
  const prediction = matches.length === 1 ? matches[0] : undefined;
  const stops = status?.route.filter(s => s.station?.code === destination) || [];
  const stop = stops.length === 1 ? stops[0] : undefined;
  const observed = eta?.observation_timestamp || status?.last_known_location?.updated_at;
  const observationAge = observed ? now - Date.parse(observed) : NaN;
  const stale = eta?.data_source === 'cached' || status?.data_source === 'cached' || (Number.isFinite(observationAge) && observationAge > 300000);
  const hasPrediction = usablePrediction(eta, prediction) && !stale;
  return <section className="space-y-5" aria-busy={loading} aria-label="Train ETA and status">
    <div className="rounded-3xl border border-primary/25 bg-card overflow-hidden shadow-sm">
      <div className="bg-primary/5 px-5 sm:px-8 py-5 flex flex-wrap justify-between gap-3 items-center border-b border-primary/15">
        <div><p className="text-xs uppercase tracking-[.16em] font-semibold text-primary mb-2">Arrival intelligence · {number}</p><h2 className="text-xl font-semibold">{status?.train_name || `Train ${number}`}</h2></div>
        <button disabled={loading} onClick={() => refresh(n => n + 1)} className="flex items-center gap-2 border border-border bg-card rounded-full px-4 py-2 text-sm disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      <div className="p-5 sm:p-8">
        {loading ? <div role="status" className="py-10 flex gap-3 items-center text-muted-foreground"><Clock3 className="animate-pulse" />Fetching the latest available arrival information…</div> : <>
          {(error || journey?.statusError) && <p role="alert" className="mb-4 text-destructive">{error || journey?.statusError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <label className="text-sm text-muted-foreground">Arrival at<select aria-label="Arrival station" className="block mt-2 max-w-full rounded-xl border border-border bg-background text-foreground px-3 py-2" value={destination} onChange={e => select(e.target.value)}>
              {!predictions.length && <option value="">Station unavailable</option>}
              {predictions.map((p, i) => p.station && <option key={`${p.station.code}-${i}`} value={p.station.code}>{p.station.name} · {p.station.code}</option>)}
            </select></label>
            <span className="text-xs rounded-full bg-muted px-3 py-2">{stale ? 'Cached / older observation' : status?.data_source === 'live' ? 'Live source' : status?.data_source || 'Data unavailable'}</span>
          </div>
          <div className="grid sm:grid-cols-[1.5fr_1fr] gap-6">
            <div><p className="text-sm font-medium text-primary mb-2">{stop?.actual_arrival ? 'Actual arrival' : 'Predicted arrival'}</p><p className="text-3xl sm:text-4xl xl:text-5xl font-semibold tracking-tight leading-tight tabular-nums">{stop?.actual_arrival ? time(stop.actual_arrival) : hasPrediction ? time(prediction?.predicted_arrival) : 'ETA unavailable'}</p>
              {!stop?.actual_arrival && hasPrediction && <p className="mt-4 text-amber-700 dark:text-amber-400 font-semibold">{delayLabel(prediction?.predicted_delay_minutes)}</p>}
              {!hasPrediction && !stop?.actual_arrival && <p className="text-sm text-muted-foreground mt-3">{journey?.etaError || 'No current prediction is available for this station. Scheduled time is shown separately.'}</p>}
            </div>
            <div className="sm:border-l border-border sm:pl-6 space-y-4"><div><p className="text-sm text-muted-foreground">Scheduled arrival</p><p className="text-xl font-medium mt-1 tabular-nums">{time(prediction?.scheduled_arrival || stop?.scheduled_arrival)}</p></div><div><p className="text-sm text-muted-foreground">Last reported running delay</p><p className="font-medium mt-1">{typeof status?.last_known_location?.delay_minutes === 'number' ? `${status.last_known_location.delay_minutes} min` : 'Unavailable'}</p></div></div>
          </div>
          <details className="mt-7 rounded-xl border border-border p-4"><summary className="cursor-pointer text-primary font-semibold">Why this ETA?</summary><div className="pt-3 text-sm text-muted-foreground space-y-2">
            <p>{hasPrediction ? eta?.explanation || `The backend returned this prediction using the ${eta?.prediction_method} method.` : 'There is no usable current ETA for this selection. A timetable is not a live prediction.'}</p>
            <p>Observation: {time(observed)}. Prediction generated: {time(eta?.prediction_generated_at)}.</p>
            <p>Specific disruption causes are not provided by this feed. No weather, signal or congestion cause is inferred.</p>
          </div></details>
          <div className="mt-5 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-2"><span>Status: <strong className="text-foreground">{status?.status || 'Unavailable'}</strong></span><span>Last reported at: <strong className="text-foreground">{status?.current_station?.name || 'Unavailable'}</strong></span><span>Journey started: {status?.date || date || 'Unavailable'}</span></div>
        </>}
      </div>
    </div>
    {status && <details open={compact ? undefined : true} className="rounded-2xl border border-border bg-card"><summary className="cursor-pointer p-5 font-semibold text-primary">View route & intermediate stations</summary><RouteTimeline key={`${number}-${status.date}-${status.route.map(s => s.station?.code).join(',')}`} route={status.route} current={status.current_station?.code} /></details>}
  </section>;
}

export function RouteTimeline({ route, current }: { route: Stop[]; current?: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const anchors = route.flatMap((s, i) => i === 0 || i === route.length - 1 || !passing(s) ? [i] : []);
  function row(index: number) {
    const s = route[index]; const isCurrent = s.station?.code === current;
    return <div key={index} className={`grid grid-cols-[minmax(70px,1fr)_28px_minmax(100px,2fr)_minmax(70px,1fr)] gap-2 px-3 sm:px-6 py-5 ${isCurrent ? 'bg-primary/5' : ''}`}>
      <div className="text-xs sm:text-sm"><p className="text-muted-foreground">{time(s.scheduled_arrival)}</p>{s.actual_arrival && <p className="text-primary mt-1">Actual {time(s.actual_arrival)}</p>}</div>
      <div className="relative flex justify-center"><span className="absolute inset-y-[-20px] w-0.5 bg-primary/20" /><span className="relative mt-1">{isCurrent ? <TrainFront size={22} className="text-primary bg-card" /> : <span className="block w-2.5 h-2.5 rounded-full bg-primary" />}</span></div>
      <div><p className="font-semibold text-sm">{s.station?.name || 'Station unavailable'}</p><p className="text-xs text-muted-foreground mt-1">{s.station?.code}{s.platform ? ` · Platform ${s.platform}` : ''}</p>{isCurrent && <p className="text-xs text-primary mt-2">Last reported position</p>}</div>
      <div className="text-xs sm:text-sm text-right"><p className="text-muted-foreground">{time(s.scheduled_departure)}</p>{s.actual_departure && <p className="text-primary mt-1">Actual {time(s.actual_departure)}</p>}</div>
    </div>;
  }
  return <section className="rounded-2xl border border-border bg-card overflow-hidden"><div className="p-5 sm:p-6 border-b border-border"><h2 className="text-lg font-semibold">Stations on your route</h2><p className="text-sm text-muted-foreground mt-1">Tap a gap to see its intermediate stations. Position follows the latest reported station.</p></div><div className="flex justify-between px-6 py-3 text-xs text-muted-foreground bg-muted/40"><span>Arrival · IST</span><span>Departure · IST</span></div>
    {!route.length && <p className="p-6 text-muted-foreground">Route unavailable.</p>}
    {anchors.map((index, j) => { const end = anchors[j + 1]; const between = end === undefined ? [] : route.slice(index + 1, end); const opened = expanded.has(index); return <div key={index}>{row(index)}{between.length > 0 && <>
      <button aria-expanded={opened} onClick={() => setExpanded(old => { const next = new Set(old); if (next.has(index)) next.delete(index); else next.add(index); return next; })} className="w-full py-6 px-5 text-sm text-primary bg-primary/[.025] hover:bg-primary/10 flex items-center justify-center gap-2"><ChevronDown size={16} className={opened ? 'rotate-180' : ''} />{opened ? 'Hide' : 'Show'} {between.length} intermediate stations<span className="sr-only"> between {route[index].station?.name} and {route[end].station?.name}</span></button>
      {between.map((s, offset) => opened || s.station?.code === current ? row(index + 1 + offset) : null)}
    </>}</div>; })}
  </section>;
}
