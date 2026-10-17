'use client';
import { Activity, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowUpRight, Network, Radio, FlaskConical, RefreshCw, Search, ArrowRight, ChartNoAxesCombined } from 'lucide-react';
import styles from './JourneyWorkspace.module.css';
import { loadInsights, type Insights } from '@/services/networkInsights';
import type { JourneyMode } from '@/services/journeyWorkspace';
import { LiveNetwork } from './LiveNetwork';
import { RouteSimulation } from './RouteSimulation';

const JourneyAnalytics = dynamic(() => import('../analytics/JourneyAnalytics'), { loading: () => <p role="status" className="p-6 text-muted-foreground">Loading analytics…</p> });
type Section = 'all' | 'tracking' | 'history';
const modes = [
  { id: 'live', title: 'Track my train', subtitle: 'Position & arrival times', icon: Radio },
  { id: 'analytics', title: 'Analytics', subtitle: 'Your journey in numbers', icon: ChartNoAxesCombined },
  { id: 'history', title: 'Past delays', subtitle: 'Learn from past journeys', icon: Network },
  { id: 'simulation', title: 'Simulation', subtitle: 'Explore a what-if journey', icon: FlaskConical },
] as const;

const mobileModeCopy = {
  live: { title: 'Find your train', description: 'See its route, latest reported position and arrival estimates.', label: 'Train tracking' },
  history: { title: 'Understand past delays', description: 'Explore recorded station patterns. These are past observations, not live alerts.', label: 'Historical records' },
  simulation: { title: 'Explore a what-if journey', description: 'Choose a train and see how an extra wait changes later arrivals.', label: 'Simulation · not live' },
  analytics: { title: 'Your journey in numbers', description: 'Compare reported arrivals with the timetable for one selected train.', label: 'Journey analysis' },
};

export function NetworkWorkspace({ initialMode = 'live', brand = 'Etaernal', section = 'all', embedded = false, activeMode, onModeChange }: { initialMode?: JourneyMode; brand?: string; section?: Section; embedded?: boolean; activeMode?: JourneyMode; onModeChange?: (mode: JourneyMode) => void }) {
  const [localMode, setMode] = useState<JourneyMode>(initialMode);
  const selectedMode = activeMode ?? localMode;
  const mode = section === 'history' ? 'history' : section === 'tracking' && selectedMode !== 'simulation' ? 'live' : selectedMode;
  const tabs = section === 'history' ? [] : section === 'tracking' ? modes.filter(item => item.id === 'live' || item.id === 'simulation') : modes;
  const title = section === 'history' ? 'Learn from past delays.' : section === 'tracking' ? 'Your train. Your route. In view.' : 'Your journey, made clearer.';
  const label = section === 'history' ? 'Past Delay Insights' : section === 'tracking' ? 'Train Tracking' : 'Journey insights';
  const intro = section === 'history' ? 'Explore historical station delays and recorded train interactions. These patterns describe past journeys, not current running conditions.' : section === 'tracking' ? 'Follow your train’s latest reported position and arrival times, or explore a clearly labelled what-if simulation.' : 'Follow your train, understand its delays, and explore what could change your arrival.';
  const selectedCopy = mobileModeCopy[mode];
  const visibleTabs = embedded ? ['live', 'history', 'simulation', 'analytics'].map(id => tabs.find(item => item.id === id)).filter((item): item is typeof modes[number] => Boolean(item)) : tabs;
  function selectMode(next: JourneyMode) { setMode(next); onModeChange?.(next); }
  return <div className={`${styles.workspace} ${embedded ? styles.embedded : ''} max-w-7xl mx-auto space-y-6 pb-10`}>
    {embedded ? <header className={styles.mobileIntro}><p>Make sense of your journey.</p><span>Track a train or explore the information behind its arrival.</span></header> : <header className={styles.hero}>
      <p className={styles.eyebrow}>{brand} / {label}</p>
      <h1>{title}</h1>
      <p className={styles.intro}>{intro}</p>
    </header>}
    {tabs.length > 0 && <nav aria-label={`${label} sections`} className={`${styles.navigation} ${section === 'tracking' ? styles.trackingNavigation : ''}`}>
      {visibleTabs.map(item => <button key={item.id} data-journey-mode={item.id} aria-pressed={mode === item.id} aria-controls="journey-content" onClick={() => selectMode(item.id)} className={styles.tab}><span className={styles.tabIcon}><item.icon size={20} aria-hidden="true" /></span><span className={styles.tabText}><span className={styles.tabTitle}>{item.title}</span>{!embedded && <span className={styles.tabSubtitle}>{item.subtitle}</span>}</span></button>)}
    </nav>}
    {embedded && <header className={styles.modeHeading}><p className={mode === 'simulation' ? styles.simulationLabel : ''}>{selectedCopy.label}</p><h1>{selectedCopy.title}</h1><span>{selectedCopy.description}</span></header>}
    <div id="journey-content" className={styles.content}>{embedded ? <EmbeddedJourneyPanels mode={mode} /> : <JourneyTool mode={mode} />}</div>
  </div>;
}
function JourneyTool({ mode, compact = false, active = true, mapRevision = 0 }: { mode: JourneyMode; compact?: boolean; active?: boolean; mapRevision?: number }) {
  return mode === 'history' ? <HistoricalInsights compact={compact} /> : mode === 'live' ? <LiveNetwork compact={compact} active={active} mapRevision={mapRevision} /> : mode === 'analytics' ? <JourneyAnalytics embedded compact={compact} /> : <RouteSimulation compact={compact} active={active} mapRevision={mapRevision} />;
}
export function EmbeddedJourneyPanels({ mode }: { mode: JourneyMode }) {
  const [saved, setSaved] = useState<{ selected: JourneyMode; visited: JourneyMode[]; revision: number }>({ selected: mode, visited: [mode], revision: 0 });
  // Mount a tool only after it is selected. Stable Activity keys retain its state;
  // hidden boundaries disconnect effects, including provider polling and playback.
  const current = saved.selected === mode ? saved : { selected: mode, visited: saved.visited.includes(mode) ? saved.visited : [...saved.visited, mode], revision: saved.revision + 1 };
  if (current !== saved) setSaved(current);
  // Leaflet removes its external map during Activity cleanup. Recreate only
  // that subtree on reactivation, even after a very quick mode switch.
  return current.visited.map(item => <Activity key={item} name={`journey-${item}`} mode={mode === item ? 'visible' : 'hidden'}><div data-journey-panel={item}><JourneyTool mode={item} compact active={mode === item} mapRevision={current.revision} /></div></Activity>);
}
export function HistoricalInsights({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState(''), [search, setSearch] = useState(''), [revision, refresh] = useState(0);
  const [data, setData] = useState<Insights | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [received, setReceived] = useState('');
  const [stationLimit, setStationLimit] = useState(5), [interactionLimit, setInteractionLimit] = useState(5);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    loadInsights(search, controller.signal).then(value => { if (!controller.signal.aborted) { setData(value); setReceived(new Date().toLocaleTimeString()); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, revision]);
  function apply(value: string) { setData(null); setQuery(value); setSearch(value.trim()); setStationLimit(5); setInteractionLimit(5); refresh(n => n + 1); }
  return <section className="space-y-5" aria-busy={loading}>
    <div className="flex flex-wrap justify-between gap-3 items-end"><div>{!compact && <h2 className="text-xl font-semibold">Where delays tend to build</h2>}<p className="text-sm text-muted-foreground mt-1">Historical analysis{data ? ` · ${data.period_start} to ${data.period_end}` : ''}. These are past observations.</p></div><button disabled={loading} onClick={() => refresh(n => n + 1)} className="flex items-center gap-2 border border-border rounded-xl p-3 text-sm disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button></div>
    <form onSubmit={e => { e.preventDefault(); apply(query); }} className="flex gap-2"><div className="relative flex-1"><Search size={18} aria-hidden="true" className="absolute left-4 top-4 text-muted-foreground" /><input aria-label="Station code or train number" maxLength={20} pattern="[A-Za-z0-9 ]*" value={query} onChange={e => setQuery(e.target.value.toUpperCase())} placeholder={compact ? 'Station code or train number' : 'Search a station code or train number · e.g. NDLS'} className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3" /></div><button className="px-5 rounded-xl bg-primary text-primary-foreground font-medium">Search</button>{search && <button type="button" onClick={() => apply('')} className="text-sm px-2">Clear</button>}</form>
    {error && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{error}{data && ' Showing the previously loaded analysis.'}</p>}
    {loading && !data && <p role="status" className="p-8 text-muted-foreground">Loading station patterns and recorded interactions…</p>}
    {data && <>
      <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">View analysis details</summary><div className="grid sm:grid-cols-3 gap-4 mt-4">{[[data.station_count, 'Stations in analysis'], [data.interaction_count, 'Past train pairs'], [data.high_risk_count, 'Pairs flagged for closer review']].map(([value, label]) => <div key={label} className="rounded-2xl border border-border bg-card p-5"><p className="text-3xl font-semibold tabular-nums">{Number(value).toLocaleString()}</p><p className="text-sm text-muted-foreground mt-2">{label}</p></div>)}</div><p className="text-xs mt-3">Station comparison scores: {data.stations.map(s => s.station + ': ' + s.bottleneck_score.toFixed(3)).join(' · ')}</p></details>
      <div className="grid xl:grid-cols-[.85fr_1.15fr] gap-5">
        <section className="rounded-2xl border border-border bg-card overflow-hidden"><div className="p-5 border-b border-border"><h3 className="font-semibold">Busy stations in past journeys</h3><p className="text-sm text-muted-foreground mt-1">These stations had more delay-related activity in past records. Select a station to see examples.</p></div><div className="max-h-[600px] overflow-auto divide-y divide-border">{data.stations.slice(0, compact ? stationLimit : data.stations.length).map(s => <button data-history-station={s.station} key={s.station} onClick={() => apply(s.station)} className="block text-left w-full p-5 hover:bg-muted/60"><div className="flex justify-between"><strong>{s.station}</strong><span className="text-xs text-primary">See examples →</span></div><div className="grid grid-cols-3 gap-2 mt-3 text-xs text-muted-foreground"><span><b className="block text-foreground text-sm">{s.interactions.toLocaleString()}</b>interactions</span><span><b className="block text-foreground text-sm">{s.mean_source_delay_minutes.toFixed(1)} min</b>earlier train’s average delay</span><span><b className="block text-foreground text-sm">{s.mean_gap_minutes.toFixed(1)} min</b>average gap</span></div></button>)}{!data.stations.length && <p className="p-6 text-muted-foreground">No stations match this search.</p>}</div>{compact && data.stations.length > 0 && <div className="border-t border-border p-4"><p className="text-xs text-muted-foreground">Showing {Math.min(stationLimit, data.stations.length)} of {data.stations.length} stations</p>{stationLimit < data.stations.length && <button type="button" onClick={() => setStationLimit(limit => limit + 5)} className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-primary">Show {Math.min(5, data.stations.length - stationLimit)} more stations</button>}</div>}</section>
        <section className="rounded-2xl border border-border bg-card overflow-hidden"><div className="p-5 border-b border-border"><h3 className="font-semibold">How delays may affect other trains</h3><p className="text-sm text-muted-foreground mt-1">When trains share tracks, a late train can make another wait. These past examples do not establish the cause or predict your current trip.</p></div><div className="max-h-[600px] overflow-auto divide-y divide-border">{data.interactions.slice(0, compact ? interactionLimit : data.interactions.length).map((r, i) => <article data-history-interaction key={`${r.service_date}-${r.station}-${i}`} className="p-5"><div className="flex justify-between text-xs text-muted-foreground gap-2"><span>{r.station} · {r.service_date}</span><details><summary className="cursor-pointer">View details</summary><p>Historical model score: {r.risk_score.toFixed(3)} · {r.risk}. A comparison indicator, not a probability.</p></details></div><div className="flex items-center gap-4 mt-3"><span className="font-semibold">{r.source_train}</span><ArrowRight size={16} className="text-muted-foreground" /><span className="font-semibold">{r.target_train}</span><span className="ml-auto text-xs text-muted-foreground">{r.gap_minutes} min gap</span></div><p className="text-xs text-muted-foreground mt-2">Recorded delays: {r.source_delay_minutes} min → {r.target_delay_minutes} min</p><div className="flex gap-4 mt-3">{[r.source_train, r.target_train].map((number, j) => <Link key={`${number}-${j}`} className="text-xs text-primary inline-flex items-center gap-1" href={`/trains/${number}`}>Track {number} now <ArrowUpRight size={12} /></Link>)}</div></article>)}{!data.interactions.length && <p className="p-6 text-muted-foreground">No train interactions match this search.</p>}</div>{compact && data.interactions.length > 0 && <div className="border-t border-border p-4"><p className="text-xs text-muted-foreground">Showing {Math.min(interactionLimit, data.interactions.length)} of {data.interactions.length} train interactions</p>{interactionLimit < data.interactions.length && <button type="button" onClick={() => setInteractionLimit(limit => limit + 5)} className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-primary">Show {Math.min(5, data.interactions.length - interactionLimit)} more interactions</button>}</div>}</section>
      </div>
      <p className="text-xs text-muted-foreground leading-5">{compact ? 'Up to 50 stations and 50 interactions are loaded, ranked by score. Show more to explore the remaining records without another request.' : 'Showing up to 50 stations and 50 interactions, ranked by score.'} Scores are comparison indicators, not percentages or calibrated probabilities. Retrieved {received}; refreshing does not change the historical observation period.</p>
    </>}
  </section>;
}
