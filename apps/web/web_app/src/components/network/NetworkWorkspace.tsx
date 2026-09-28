'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Network, Radio, FlaskConical, RefreshCw, Search, ArrowRight } from 'lucide-react';
import { loadInsights, type Insights } from '@/services/networkInsights';
import { LiveNetwork } from './LiveNetwork';
import { useSimulation } from '@/hooks/useSimulation';
import { SimControlPanel } from './SimControlPanel';
import { SimMapWrapper } from './SimMapWrapper';

type Mode = 'history' | 'live' | 'simulation';
export function NetworkWorkspace({ initialMode = 'live' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  return <div className="max-w-7xl mx-auto space-y-6 pb-10">
    <header className="rounded-3xl bg-[#071c40] text-white p-6 sm:p-9 relative overflow-hidden">
      <p className="text-xs uppercase tracking-[.2em] text-blue-200 mb-3">Equinox · Railway intelligence</p>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Your journey, made clearer.<br /><span className="text-blue-300">Know where you stand.</span></h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Explore station delay patterns, follow a train’s latest journey, or test how a disruption affects a corridor.</p>
    </header>
    <nav aria-label="Network modes" className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2">
      {([{ id: 'history', title: 'Past delay patterns', subtitle: 'Historical patterns', icon: Network }, { id: 'live', title: 'Track my train', subtitle: 'Train status & route', icon: Radio }, { id: 'simulation', title: 'Simulation mode', subtitle: 'Explore a what-if scenario', icon: FlaskConical }] as const).map(item => <button key={item.id} aria-pressed={mode === item.id} onClick={() => setMode(item.id)} className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${mode === item.id ? 'bg-primary/10 text-primary ring-1 ring-primary/25' : 'hover:bg-muted'}`}><item.icon size={20} /><span><span className="block text-sm font-semibold">{item.title}</span><span className="text-xs text-muted-foreground">{item.subtitle}</span></span></button>)}
    </nav>
    {mode === 'history' ? <HistoricalInsights /> : mode === 'live' ? <LiveNetwork /> : <Simulation />}
  </div>;
}
function HistoricalInsights() {
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [revision, refresh] = useState(0);
  const [data, setData] = useState<Insights | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [received, setReceived] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    loadInsights(search, controller.signal).then(value => { if (!controller.signal.aborted) { setData(value); setReceived(new Date().toLocaleTimeString()); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, revision]);
  function apply(value: string) { setData(null); setQuery(value); setSearch(value.trim()); refresh(n => n + 1); }
  return <section className="space-y-5" aria-busy={loading}>
    <div className="flex flex-wrap justify-between gap-3 items-end"><div><h2 className="text-xl font-semibold">Where delays tend to build</h2><p className="text-sm text-muted-foreground mt-1">Historical analysis{data ? ` · ${data.period_start} to ${data.period_end}` : ''}. These are past observations.</p></div><button disabled={loading} onClick={() => refresh(n => n + 1)} className="flex items-center gap-2 border border-border rounded-xl p-3 text-sm disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button></div>
    <form onSubmit={e => { e.preventDefault(); apply(query); }} className="flex gap-2"><div className="relative flex-1"><Search size={18} className="absolute left-4 top-4 text-muted-foreground" /><input aria-label="Station code or train number" maxLength={20} pattern="[A-Za-z0-9 ]*" value={query} onChange={e => setQuery(e.target.value.toUpperCase())} placeholder="Search a station code or train number · e.g. NDLS" className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3" /></div><button className="px-5 rounded-xl bg-primary text-primary-foreground font-medium">Search</button>{search && <button type="button" onClick={() => apply('')} className="text-sm px-2">Clear</button>}</form>
    {error && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{error}{data && ' Showing the previously loaded analysis.'}</p>}
    {loading && !data && <p role="status" className="p-8 text-muted-foreground">Loading station patterns and recorded interactions…</p>}
    {data && <>
      <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">View analysis details</summary><div className="grid sm:grid-cols-3 gap-4 mt-4">{[[data.station_count, 'Stations in analysis'], [data.interaction_count, 'Past train pairs'], [data.high_risk_count, 'Pairs flagged for closer review']].map(([value, label]) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><p className="text-3xl font-semibold tabular-nums">{Number(value).toLocaleString()}</p><p className="text-sm text-muted-foreground mt-2">{label}</p></div>)}</div><p className="text-xs mt-3">Station comparison scores: {data.stations.map(s => s.station + ': ' + s.bottleneck_score.toFixed(3)).join(' · ')}</p></details>
      <div className="grid xl:grid-cols-[.85fr_1.15fr] gap-5">
        <section className="rounded-2xl border border-border bg-card overflow-hidden"><div className="p-5 border-b border-border"><h3 className="font-semibold">Busy stations in past journeys</h3><p className="text-sm text-muted-foreground mt-1">These stations had more delay-related activity in past records. Select a station to see examples.</p></div><div className="max-h-[600px] overflow-auto divide-y divide-border">{data.stations.map(s => <button key={s.station} onClick={() => apply(s.station)} className="block text-left w-full p-5 hover:bg-muted/60"><div className="flex justify-between"><strong>{s.station}</strong><span className="text-xs text-primary">See examples →</span></div><div className="grid grid-cols-3 gap-2 mt-3 text-xs text-muted-foreground"><span><b className="block text-foreground text-sm">{s.interactions.toLocaleString()}</b>interactions</span><span><b className="block text-foreground text-sm">{s.mean_source_delay_minutes.toFixed(1)} min</b>earlier train’s average delay</span><span><b className="block text-foreground text-sm">{s.mean_gap_minutes.toFixed(1)} min</b>average gap</span></div></button>)}{!data.stations.length && <p className="p-6 text-muted-foreground">No stations match this search.</p>}</div></section>
        <section className="rounded-2xl border border-border bg-card overflow-hidden"><div className="p-5 border-b border-border"><h3 className="font-semibold">How delays may affect other trains</h3><p className="text-sm text-muted-foreground mt-1">When trains share tracks, a late train can make another wait. These past examples do not establish the cause or predict your current trip.</p></div><div className="max-h-[600px] overflow-auto divide-y divide-border">{data.interactions.map((r, i) => <article key={`${r.service_date}-${r.station}-${i}`} className="p-5"><div className="flex justify-between text-xs text-muted-foreground gap-2"><span>{r.station} · {r.service_date}</span><details><summary className="cursor-pointer">View details</summary><p>Historical model score: {r.risk_score.toFixed(3)} · {r.risk}. A comparison indicator, not a probability.</p></details></div><div className="flex items-center gap-4 mt-3"><span className="font-semibold">{r.source_train}</span><ArrowRight size={16} className="text-muted-foreground" /><span className="font-semibold">{r.target_train}</span><span className="ml-auto text-xs text-muted-foreground">{r.gap_minutes} min gap</span></div><p className="text-xs text-muted-foreground mt-2">Recorded delays: {r.source_delay_minutes} min → {r.target_delay_minutes} min</p><div className="flex gap-4 mt-3">{[r.source_train, r.target_train].map((number, j) => <Link key={`${number}-${j}`} className="text-xs text-primary inline-flex items-center gap-1" href={`/trains/${number}`}>Track {number} now <ArrowUpRight size={12} /></Link>)}</div></article>)}{!data.interactions.length && <p className="p-6 text-muted-foreground">No train interactions match this search.</p>}</div></section>
      </div>
      <p className="text-xs text-muted-foreground leading-5">Showing up to 50 stations and 50 interactions, ranked by score. Scores are comparison indicators, not percentages or calibrated probabilities. Retrieved {received}; refreshing does not change the historical observation period.</p>
    </>}
  </section>;
}
function Simulation() {
  const sim = useSimulation(); const [selected, select] = useState<string | null>(null);
  return <section className="space-y-4"><div><h2 className="text-xl font-semibold">Explore a corridor disruption</h2><p className="text-sm text-muted-foreground mt-1">1. Start the scenario · 2. Create a bottleneck · 3. Apply mitigation and observe recovery.</p></div><SimControlPanel running={sim.running} speed={sim.speed} state={sim.state} metrics={sim.metrics} onStart={sim.start} onPause={sim.pause} onReset={() => { sim.reset(); select(null); }} onTriggerBottleneck={sim.triggerBottleneck} onRunMitigation={sim.runMitigation} onSetSpeed={sim.setSpeed} /><div className="h-[520px] rounded-2xl overflow-hidden border border-border"><SimMapWrapper trains={sim.trains} segments={sim.segments} selectedId={selected} onSelect={select} /></div><p className="text-xs text-muted-foreground">Illustrative model on a geographic basemap. Straight lines connect approximate station locations; they are not surveyed railway track geometry. Speeds, delays and mitigation outcomes are simulated.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{sim.trains.map(t => <button key={t.id} onClick={() => select(t.id)} className={`text-left p-4 border rounded-xl bg-card ${selected === t.id ? 'border-primary' : 'border-border'}`}><strong className="text-sm">{t.name}</strong><p className="text-xs text-muted-foreground mt-2">{t.fromStation.code} → {t.toStation.code}</p><p className="text-sm mt-2">{Math.round(t.speedKmh)} km/h · {t.delayMinutes.toFixed(1)} min delay</p></button>)}</div></section>;
}
