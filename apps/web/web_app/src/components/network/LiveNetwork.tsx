'use client';
import { useEffect, useState } from 'react';
import { PASSENGER_API, validDate, type Status, time } from '@/services/passenger';
import { MapWrapper } from './MapWrapper';
import { PassengerJourney } from '@/components/eta/PassengerJourney';
import type { TrainStatus } from '@/types/api';

type LocatedStatus = Status & { last_known_location?: TrainStatus['last_known_location'] };
export function LiveNetwork() {
  const [number, setNumber] = useState(''), [date, setDate] = useState('');
  const [tracked, track] = useState<{ number: string; date: string } | null>(null);
  const [status, setStatus] = useState<LocatedStatus | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!tracked) return;
    const controller = new AbortController(); let busy = false; let pinnedDate = tracked.date;
    async function load() {
      if (busy) return; busy = true; setLoading(true);
      try {
        const response = await fetch(`${PASSENGER_API}/trains/${tracked!.number}/status${pinnedDate ? `?date=${pinnedDate}` : ''}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]), cache: 'no-store' });
        if (!response.ok) throw new Error('Train status unavailable. Check the number and start date, then retry.');
        const data = await response.json();
        if (data.train_number !== tracked!.number || !validDate(data.date) || (pinnedDate && data.date !== pinnedDate) || !['live', 'cached', 'database'].includes(data.data_source)) throw new Error('The train observation could not be verified.');
        if (!controller.signal.aborted) { pinnedDate = data.date; setStatus(data); setError(''); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Train status unavailable.'); }
      finally { busy = false; if (!controller.signal.aborted) setLoading(false); }
    }
    load(); const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [tracked]);
  const location = status?.last_known_location;
  const old = status?.data_source !== 'live' || !location?.updated_at || !Number.isFinite(Date.parse(location.updated_at)) || Date.now() - Date.parse(location.updated_at) > 300000;
  const mapTrains: TrainStatus[] = status ? [{ train_number: status.train_number, train_name: status.train_name, data_source: status.data_source, current_station: status.current_station || { code: '', name: 'Unavailable' }, next_station: { code: '', name: 'Unavailable' }, predicted_next_arrival: '', scheduled_departure: '', zone: '', delay_minutes: status.overall_delay_minutes ?? 0, status: status.overall_delay_minutes ? 'DELAYED' : 'ON_TIME', last_known_location: location }] : [];
  return <section className="space-y-5"><div><h2 className="text-xl font-semibold">Follow a train’s current journey</h2><p className="text-sm text-muted-foreground mt-1">Track a train to see available position, route stops and arrival estimates. Updates every 30 seconds while this view is active.</p></div>
    <form onSubmit={e => { e.preventDefault(); setStatus(null); setError(''); track({ number, date }); }} className="rounded-2xl border border-border bg-card p-5 flex flex-wrap gap-4 items-end"><label className="text-xs text-muted-foreground flex-1 min-w-40">Train number<input required pattern="[0-9]{5}" inputMode="numeric" maxLength={5} value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 12423" className="block mt-2 rounded-xl border border-border bg-background p-3 text-sm text-foreground w-full" /></label><label className="text-xs text-muted-foreground flex-1 min-w-40">Train start date · optional<input type="date" value={date} onChange={e => setDate(e.target.value)} className="block mt-2 rounded-xl border border-border bg-background p-3 text-sm text-foreground w-full" /></label><button disabled={loading} className="rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold disabled:opacity-50">{loading ? 'Checking…' : 'Track train'}</button></form>
    {error && <p role="alert" className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm">{error}{status && ' The map retains the previous observation.'}</p>}
    <div className="rounded-2xl border border-border bg-card overflow-hidden"><div className="px-5 py-4 flex flex-wrap justify-between gap-2 text-sm"><strong>Geographic view</strong><span className="text-muted-foreground">{status ? `${error || old ? 'Previous / cached observation' : 'Latest available observation'} · ${time(location?.updated_at)}` : 'Choose a train to begin'}</span></div><div className="h-[420px]"><MapWrapper trains={mapTrains} selectedTrainId={status?.train_number || null} onSelectTrain={() => {}} /></div><p className="p-4 text-xs text-muted-foreground">Position source: {location?.position_source || 'Unavailable'}. Derived positions are estimates between reported stops. Network-wide signalling and track occupancy are not supplied by this feed.</p></div>
    {tracked && status && <PassengerJourney key={`${tracked.number}-${status.date}`} number={tracked.number} date={status.date} autoRefresh />}
  </section>;
}
