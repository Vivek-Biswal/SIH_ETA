'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  CirclePause,
  Gauge,
  Info,
  MapPin,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrainFront,
  TriangleAlert,
} from 'lucide-react';
import { useSimulation, SIM_STATIONS } from '@/hooks/useSimulation';
import { SimTrain } from '@/types/simulation';
import { SimMapWrapper } from './SimMapWrapper';
import { buildSimulationInsights, SimulationStationInsight } from './simulationView';

type DetailView = 'passenger' | 'technical';

function stateCopy(state: ReturnType<typeof useSimulation>['state']) {
  switch (state) {
    case 'BUILDING': return { label: 'Delay starting', tone: 'text-amber-700 bg-amber-100 border-amber-200', description: 'The disruption is building on the corridor.' };
    case 'CRITICAL': return { label: 'Disruption active', tone: 'text-red-700 bg-red-100 border-red-200', description: 'A busy section is slowing trains down.' };
    case 'MITIGATION': return { label: 'Recovery plan running', tone: 'text-blue-700 bg-blue-100 border-blue-200', description: 'The control plan is helping trains recover.' };
    case 'RECOVERY': return { label: 'Recovering', tone: 'text-blue-700 bg-blue-100 border-blue-200', description: 'Delays are reducing as capacity returns.' };
    case 'RECOVERED': return { label: 'Recovered', tone: 'text-emerald-700 bg-emerald-100 border-emerald-200', description: 'The corridor is back to normal in this scenario.' };
    default: return { label: 'On schedule', tone: 'text-emerald-700 bg-emerald-100 border-emerald-200', description: 'No disruption has been created yet.' };
  }
}

function passengerMessage(train: SimTrain, destination: string, delay: number, state: ReturnType<typeof useSimulation>['state']) {
  if (state === 'NORMAL' && delay === 0) return `${train.name} is moving normally in this scenario. Create a disruption to see how passenger arrival times could change.`;
  if (state === 'RECOVERED' || state === 'RECOVERY' || state === 'MITIGATION') {
    return delay > 0
      ? `The recovery plan is reducing the delay before ${train.name} reaches ${destination}. Watch the estimate improve as the scenario runs.`
      : `${train.name} is recovering and is currently expected to reach ${destination} without an additional simulated delay.`;
  }
  return delay > 0
    ? `A simulated delay is travelling with ${train.name}. The current model adds about ${delay} minute${delay === 1 ? '' : 's'} before ${destination}.`
    : `The disruption has not reached ${train.name} yet. Keep the scenario running to see whether its arrival estimate changes.`;
}

function formatMinutes(value: number) {
  if (value <= 1) return 'about 1 min';
  return `about ${value} min`;
}

function TrainPicker({ trains, selectedId, onSelect }: { trains: SimTrain[]; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Step 1 · Choose a train</p>
        <h3 className="mt-1 text-lg font-semibold">Follow one journey through the scenario</h3>
        <p className="mt-1 text-sm text-muted-foreground">The map and arrival estimates update for the train you select.</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"><TriangleAlert size={14} />Simulation only</div>
    </div>
    <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="simulation-train">Train</label>
    <select id="simulation-train" value={selectedId} onChange={(event) => onSelect(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
      {trains.map((train) => <option key={train.id} value={train.id}>{train.name} · {train.id.replace('SIM-', '')} · {train.fromStation.code} → {train.toStation.code}</option>)}
    </select>
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
      <span className="rounded-full bg-muted px-2.5 py-1">Current section updates live</span>
      <span className="rounded-full bg-muted px-2.5 py-1">One highlighted route</span>
      <span className="rounded-full bg-muted px-2.5 py-1">No live railway feed</span>
    </div>
  </div>;
}

function ScenarioControls({ running, speed, state, onStart, onPause, onReset, onTrigger, onMitigation, onSpeed }: {
  running: boolean;
  speed: number;
  state: ReturnType<typeof useSimulation>['state'];
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onTrigger: () => void;
  onMitigation: () => void;
  onSpeed: (speed: number) => void;
}) {
  const active = state !== 'NORMAL';
  return <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Step 2 · Run a what-if scenario</p>
        <h3 className="mt-1 text-lg font-semibold">Create a disruption and watch the effect</h3>
        <p className="mt-1 text-sm text-muted-foreground">The model moves trains and recalculates delay as the corridor changes.</p>
      </div>
      <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${stateCopy(state).tone}`}>{stateCopy(state).label}</div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button onClick={running ? onPause : onStart} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"><span aria-hidden>{running ? <CirclePause size={16} /> : <Play size={16} />}</span>{running ? 'Pause simulation' : active ? 'Resume simulation' : 'Start simulation'}</button>
      <button onClick={onReset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"><RotateCcw size={15} />Reset</button>
      <div className="ml-0 flex items-center gap-1 rounded-xl border border-border p-1 sm:ml-2" aria-label="Simulation speed">
        {[1, 2, 4].map((value) => <button key={value} onClick={() => onSpeed(value)} aria-pressed={speed === value} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${speed === value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}>{value}×</button>)}
      </div>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button disabled={state !== 'NORMAL'} onClick={onTrigger} className="group flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"><span><span className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={16} />Create a disruption</span><span className="mt-1 block text-xs text-amber-800/80">Reduce capacity between Agra Cantt and Dholpur</span></span><ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></button>
      <button disabled={state !== 'BUILDING' && state !== 'CRITICAL'} onClick={onMitigation} className="group flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-900 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"><span><span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} />Start recovery plan</span><span className="mt-1 block text-xs text-blue-800/80">Restore speed and reduce the waiting time</span></span><ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></button>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{stateCopy(state).description} This is a deterministic passenger-facing demonstration; it does not represent the current railway network.</p>
  </div>;
}

function PropagationTimeline({ rows, disruptionCode }: { rows: SimulationStationInsight[]; disruptionCode: string | undefined }) {
  return <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Activity size={18} /></div><div><h3 className="font-semibold">How the delay travels</h3><p className="mt-1 text-sm text-muted-foreground">Each stop uses the current simulation state. The number shows extra time compared with the normal run.</p></div></div>
    <div className="mt-5 space-y-3">
      {rows.map((row, index) => <div key={row.station.code} className="relative flex gap-3">
        {index < rows.length - 1 && <span className="absolute left-[11px] top-7 h-[calc(100%+4px)] w-px bg-border" aria-hidden />}
        <span className={`relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 ${row.changeMinutes > 0 ? 'border-amber-500 bg-amber-100' : 'border-emerald-500 bg-emerald-100'}`} />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{row.station.name} <span className="font-normal text-muted-foreground">({row.station.code})</span></p><p className="mt-0.5 text-xs text-muted-foreground">{index === 0 && row.station.code === disruptionCode ? 'Disruption section' : row.status === 'recovery' ? 'Recovery in progress' : row.changeMinutes > 0 ? 'Delay carried forward' : 'No extra wait yet'}</p></div><span className={`shrink-0 text-sm font-semibold tabular-nums ${row.changeMinutes > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{row.changeMinutes > 0 ? `+${row.changeMinutes} min` : 'On time'}</span></div>
      </div>)}
      {!rows.length && <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">The selected train is at the end of the corridor. Reset the scenario to follow it from the beginning.</p>}
    </div>
  </div>;
}

function ArrivalTable({ rows }: { rows: SimulationStationInsight[] }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="border-b border-border p-4 sm:p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-500/10 p-2 text-blue-600"><MapPin size={18} /></div><div><h3 className="font-semibold">Arrival estimate by stop</h3><p className="mt-1 text-sm text-muted-foreground">Times are measured from the selected train’s current position.</p></div></div></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Stop</th><th className="px-4 py-3 font-medium">Normal run</th><th className="px-4 py-3 font-medium">Scenario estimate</th><th className="px-4 py-3 text-right font-medium">Change</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row.station.code} className="hover:bg-muted/30"><td className="px-4 py-3"><span className="font-semibold">{row.station.name}</span><span className="ml-2 text-xs text-muted-foreground">{row.station.code}</span></td><td className="px-4 py-3 text-muted-foreground">{formatMinutes(row.scheduledMinutes)}</td><td className="px-4 py-3 font-medium">{formatMinutes(row.simulatedMinutes)}</td><td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.changeMinutes > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{row.changeMinutes > 0 ? `+${row.changeMinutes} min` : 'On time'}</td></tr>)}</tbody></table></div>
    {!rows.length && <p className="p-5 text-sm text-muted-foreground">No upcoming stops are available for this simulation position.</p>}
  </div>;
}

function TechnicalDetails({ sim, selected }: { sim: ReturnType<typeof useSimulation>; selected: SimTrain }) {
  const cards = [
    ['Corridor congestion', `${sim.metrics.congestionPct}%`, 'Sections currently slowed'],
    ['Trains affected', `${sim.metrics.affectedTrains} / ${sim.trains.length}`, 'With a simulated delay'],
    ['Average delay', `${sim.metrics.avgDelayMinutes} min`, 'Across this scenario'],
    ['Flow index', `${sim.metrics.throughputPct}%`, 'Remaining corridor capacity'],
    ['Recovery', `${sim.metrics.recoveryPct}%`, 'Progress after mitigation'],
    ['Selected speed', `${Math.round(selected.speedKmh)} km/h`, selected.status.replace('_', ' ').toLowerCase()],
  ];
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value, caption]) => <div key={label} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{caption}</p></div>)}</div><div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground"><p className="flex items-start gap-2 font-medium text-foreground"><Info size={16} className="mt-1 shrink-0 text-primary" />How to read the model</p><p className="mt-2">Congestion is the share of corridor sections that are no longer normal. Flow index is a simple capacity signal. Delay and recovery values come from the running simulation state and are not a live railway prediction.</p></div></div>;
}

export function SimulationExperience() {
  const sim = useSimulation();
  const [selectedId, setSelectedId] = useState(sim.trains[0]?.id ?? '');
  const [detailView, setDetailView] = useState<DetailView>('passenger');
  const selected = sim.trains.find((train) => train.id === selectedId) ?? sim.trains[0];
  const selectedInsights = useMemo(() => selected ? buildSimulationInsights(selected, SIM_STATIONS, sim.segments, sim.state, sim.metrics.recoveryPct) : null, [selected, sim.segments, sim.state, sim.metrics.recoveryPct]);

  useEffect(() => {
    if (sim.trains.length && !sim.trains.some((train) => train.id === selectedId)) setSelectedId(sim.trains[0].id);
  }, [sim.trains, selectedId]);

  if (!selected || !selectedInsights) return <section className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Preparing the simulation corridor…</section>;

  const status = stateCopy(sim.state);
  const destinationDelay = selectedInsights.destinationDelayMinutes;
  const disruptionSegment = selectedInsights.disruptionSegment;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><Sparkles size={15} /> Passenger-friendly simulation</div><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">See how one delay changes a journey</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose a train, run a what-if disruption, and watch its route, movement and arrival estimates change together.</p></div><div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${status.tone}`}><span className="h-2 w-2 rounded-full bg-current" />{status.label}</div></div>
    <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]"><TrainPicker trains={sim.trains} selectedId={selected.id} onSelect={setSelectedId} /><ScenarioControls running={sim.running} speed={sim.speed} state={sim.state} onStart={sim.start} onPause={sim.pause} onReset={() => { sim.reset(); setSelectedId(''); }} onTrigger={sim.triggerBottleneck} onMitigation={sim.runMitigation} onSpeed={sim.setSpeed} /></div>
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center"><div><p className="text-xs text-muted-foreground">Selected train</p><div className="mt-1 flex items-center gap-2"><TrainFront size={20} className="text-primary" /><h3 className="text-lg font-semibold">{selected.name}</h3><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{selected.id.replace('SIM-', '')}</span></div><p className="mt-1 text-sm text-muted-foreground">Currently between {selected.fromStation.name} and {selected.toStation.name}</p></div><ArrowRight className="hidden text-muted-foreground lg:block" size={22} /><div className="grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Speed</p><p className="mt-1 font-semibold tabular-nums">{Math.round(selected.speedKmh)} km/h</p></div><div><p className="text-xs text-muted-foreground">Current delay</p><p className={`mt-1 font-semibold tabular-nums ${selected.delayMinutes > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{selected.delayMinutes > 0 ? `+${Math.round(selected.delayMinutes)} min` : 'On time'}</p></div><div><p className="text-xs text-muted-foreground">Next stop</p><p className="mt-1 font-semibold">{selected.toStation.code}</p></div></div></div>
    <div className="h-[420px] overflow-hidden rounded-2xl border border-border bg-muted/20 sm:h-[520px]"><SimMapWrapper trains={sim.trains} segments={sim.segments} selectedId={selected.id} onSelect={(id) => { if (id) setSelectedId(id); }} disruptionSegmentId={disruptionSegment?.id} disruptionStationCode={disruptionSegment?.from.code} /></div>
    <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info size={14} className="mt-0.5 shrink-0" />The map highlights the selected train’s remaining corridor. Other trains are faded for context. Straight lines connect approximate station locations; they are not surveyed railway track geometry. All speeds, delays and recovery outcomes are simulated.</p>
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Step 3 · Passenger impact</p><h3 className="mt-1 text-xl font-semibold">What this means for {selected.name}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{passengerMessage(selected, selectedInsights.destination.name, destinationDelay, sim.state)}</p></div><div className="rounded-xl bg-muted px-3 py-2 text-right"><p className="text-xs text-muted-foreground">Estimated arrival at {selectedInsights.destination.code}</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatMinutes(selectedInsights.remainingMinutes)}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border/70 bg-background p-3"><p className="text-xs text-muted-foreground">Normal arrival</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatMinutes(selectedInsights.stationRows.at(-1)?.scheduledMinutes ?? selectedInsights.remainingMinutes)}</p></div><div className="rounded-xl border border-border/70 bg-background p-3"><p className="text-xs text-muted-foreground">Scenario arrival</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatMinutes(selectedInsights.remainingMinutes)}</p></div><div className="rounded-xl border border-border/70 bg-background p-3"><p className="text-xs text-muted-foreground">Difference</p><p className={`mt-1 text-lg font-semibold tabular-nums ${destinationDelay > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{destinationDelay > 0 ? `+${destinationDelay} min` : 'No extra wait'}</p></div></div></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-xl border border-border bg-card p-1"><button onClick={() => setDetailView('passenger')} aria-pressed={detailView === 'passenger'} className={`rounded-lg px-3 py-2 text-sm font-semibold ${detailView === 'passenger' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Passenger view</button><button onClick={() => setDetailView('technical')} aria-pressed={detailView === 'technical'} className={`rounded-lg px-3 py-2 text-sm font-semibold ${detailView === 'technical' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Technical details</button></div><p className="text-xs text-muted-foreground">Updates while the simulation is running</p></div>
    {detailView === 'passenger' ? <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]"><PropagationTimeline rows={selectedInsights.stationRows} disruptionCode={disruptionSegment?.from.code} /><ArrivalTable rows={selectedInsights.stationRows} /></div> : <TechnicalDetails sim={sim} selected={selected} />}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950"><Gauge size={15} className="shrink-0" /><span><strong>Simulation mode:</strong> this corridor is a deterministic model for learning and planning. It does not use live train locations and should not be used as a live travel alert.</span></div>
  </section>;
}
