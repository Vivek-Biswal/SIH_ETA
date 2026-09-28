'use client';
import { useEffect, useRef, useState } from 'react';
import { loadJourney, validDate, time, delayLabel, type Journey } from '@/services/passenger';
import { resolveRoute, type RoutePoint } from '@/services/routeGeometry';
import { MapWrapper } from './MapWrapper';
import { PassengerJourney } from '@/components/eta/PassengerJourney';
import type { TrainStatus } from '@/types/api';

export function LiveNetwork() {
  const [number, setNumber] = useState(''), [date, setDate] = useState('');
  const [tracked, track] = useState<{ number: string; date: string } | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<RoutePoint[]>([]), [routeLoading, setRouteLoading] = useState(false);
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    if (!tracked) return;
    const controller = new AbortController();
    let busy = false, failures = 0, nextAttempt = 0, pinnedDate = tracked.date;
    async function load() {
      if (busy || document.visibilityState === 'hidden' || Date.now() < nextAttempt) return;
      busy = true; setLoading(true);
      try {
        const result = await loadJourney(tracked!.number, pinnedDate, controller.signal);
        if (controller.signal.aborted) return;
        if (!result.status) throw new Error(result.statusError || 'Train information is temporarily unavailable.');
        if (!validDate(result.status.date)) throw new Error('The journey date could not be verified.');
        pinnedDate = result.status.date;
        setJourney(result); setError(result.etaError || '');
        failures = result.etaError ? Math.min(failures + 1, 3) : 0;
      } catch (cause) {
        if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : 'Please retry.'); failures = Math.min(failures + 1, 3); }
      } finally {
        nextAttempt = Date.now() + 30000 * 2 ** failures;
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    refresh.current = load;
    void load();
    const timer = setInterval(load, 30000);
    document.addEventListener('visibilitychange', load);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load); refresh.current = () => {}; };
  }, [tracked]);
  const status = journey?.status;
  useEffect(() => {
    if (!status) return;
    const controller = new AbortController();
    setRouteLoading(true);
    resolveRoute(status, controller.signal).then(points => { if (!controller.signal.aborted) setRoute(points); }).finally(() => { if (!controller.signal.aborted) setRouteLoading(false); });
    return () => controller.abort();
  }, [status]);
  const location = status?.last_known_location;
  const trains: TrainStatus[] = status ? [{ train_number: status.train_number, train_name: status.train_name, data_source: status.data_source, current_station: status.current_station || { code: '', name: 'Unavailable' }, next_station: { code: '', name: 'Unavailable' }, predicted_next_arrival: '', scheduled_departure: '', zone: '', delay_minutes: status.overall_delay_minutes ?? 0, status: status.overall_delay_minutes ? 'DELAYED' : 'ON_TIME', last_known_location: location ? { ...location, delay_minutes: location.delay_minutes ?? undefined } : undefined }] : [];
  return <section className="space-y-5">
    <div><h2 className="text-2xl font-semibold">Where is my train?</h2><p className="text-sm text-muted-foreground mt-2">Enter a train number to see its route, latest reported position and arrival times.</p></div>
    <form onSubmit={event => { event.preventDefault(); if (!/^\d{5}$/.test(number) || (date && !validDate(date))) { setError('Enter a five-digit train number and a valid start date.'); return; } setJourney(null); setRoute([]); setRouteLoading(false); setError(''); track({ number, date }); }} className="rounded-2xl border border-border bg-card p-5 flex flex-wrap gap-4 items-end">
      <label className="text-sm flex-1 min-w-40">Train number<input required pattern="[0-9]{5}" inputMode="numeric" maxLength={5} value={number} onChange={event => setNumber(event.target.value)} placeholder="e.g. 12423" className="block mt-2 rounded-xl border border-border bg-background p-3 w-full" /></label>
      <label className="text-sm flex-1 min-w-40">Journey start date · optional<input type="date" value={date} onChange={event => setDate(event.target.value)} className="block mt-2 rounded-xl border border-border bg-background p-3 w-full" /></label>
      <button className="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold">Track train</button>
    </form>
    {error && <p role="alert" className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm">{error}{status && ' Last available information remains visible.'}</p>}
    {loading && !status && <p role="status">Finding your train…</p>}
    {status && <>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-primary font-semibold">{status.train_number} · {status.date}</p><h3 className="text-xl font-semibold mt-1">{status.train_name}</h3><p className="mt-2 text-sm">{status.route[0]?.station?.name || 'Origin unavailable'} → {status.route.at(-1)?.station?.name || 'Destination unavailable'}</p><div className="flex flex-wrap gap-5 mt-4 text-sm"><span>Last reported: <strong>{status.current_station?.name || 'Unavailable'}</strong></span><span>{delayLabel(status.overall_delay_minutes)}</span><span>Updated: {time(location?.updated_at)}</span></div></div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden"><div className="p-4 flex justify-between gap-3"><strong>Your train’s route</strong><button disabled={loading} onClick={() => refresh.current()} className="text-primary disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button></div><div className="h-[520px]"><MapWrapper key={status.train_number + status.date} trains={trains} route={route} routeLoading={routeLoading} selectedTrainId={status.train_number} onSelectTrain={() => {}} /></div><p className="p-4 text-xs text-muted-foreground">{route.length} of {status.route.length} stops mapped. Dashed lines connect station locations approximately; exact railway track geometry is unavailable. Updates every 30 seconds while visible, with longer waits after errors.</p></div>
      <PassengerJourney number={status.train_number} date={status.date} suppliedJourney={journey!} refreshing={loading} onRefresh={() => refresh.current()} />
    </>}
    {!tracked && <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-10 text-center"><h3 className="font-semibold">Your journey, on one map</h3><p className="mt-2 text-sm text-muted-foreground">Choose a train above to begin. Only your selected train will appear here.</p></div>}
  </section>;
}
