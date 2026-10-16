'use client';
import { useEffect, useState } from 'react';
import { ArrivalWeather } from './ArrivalWeather';
import { EtaFeedback } from './EtaFeedback';
import { IncidentReport } from './IncidentReport';
import timeline from './RouteTimeline.module.css';
import { Clock3, RefreshCw, TrainFront, ChevronDown } from 'lucide-react';
import { delayLabel, loadJourney, passing, time, usablePrediction, type ArrivalTiming, type ETA, type Journey, type Stop } from '@/services/passenger';
import { confirmedStopTime, matchingStop, predictionKey, selectedPrediction, stationArrival } from '@/services/etaReason';
import { useLiveRefresh } from '@/services/preferences';

function TimingSummary({ timing, station }: { timing: ArrivalTiming; station: string }) {
  const current = timing.current_delay_minutes;
  const extraDelay = (timing.expected_additional_delay_minutes ?? 0) > 0;
  const possible = extraDelay ? timing.expected_additional_delay_minutes : timing.expected_recovery_minutes;
  const hasEstimate = timing.future_recovery_status === 'estimated' && possible !== null;
  const noDelayToRecover = hasEstimate && !extraDelay && current !== null && current <= 0 && possible === 0;
  const recoveredAtOneStop = timing.recovery_from_station === timing.recovery_to_station;
  return <dl aria-label="Delay and recovery" className="grid gap-4 rounded-xl border border-border bg-card/50 p-4 text-sm sm:grid-cols-3">
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">Current timing</dt>
      <dd className="mt-1.5 font-semibold tabular-nums text-foreground">{current === null ? 'Not reported' : current > 0 ? `${current} min late` : current < 0 ? `${Math.abs(current)} min early` : 'On time'}</dd>
      <dd className="mt-1 text-xs leading-5 text-muted-foreground">Latest running update</dd>
    </div>
    <div className="min-w-0 sm:border-l sm:border-border sm:pl-4">
      <dt className="text-xs font-medium text-muted-foreground">Already recovered</dt>
      <dd className="mt-1.5 font-semibold tabular-nums text-foreground">{timing.recovered_minutes === null ? 'Not enough timings' : `${timing.recovered_minutes} min`}</dd>
      <dd className="mt-1 text-xs leading-5 text-muted-foreground">{timing.recovered_minutes === null ? 'Needs confirmed station timings' : recoveredAtOneStop ? `During the stop at ${timing.recovery_to_station}` : `Between ${timing.recovery_from_station} and ${timing.recovery_to_station}`}</dd>
    </div>
    <div className="min-w-0 sm:border-l sm:border-border sm:pl-4">
      <dt className="text-xs font-medium text-muted-foreground">{extraDelay ? 'Possible extra delay' : 'Possible recovery'} by {station}</dt>
      <dd className="mt-1.5 font-semibold tabular-nums text-foreground">{noDelayToRecover ? 'No delay to recover' : hasEstimate ? possible > 0 ? `About ${possible} min` : '0 min expected' : 'Not estimated'}</dd>
      <dd className="mt-1 text-xs leading-5 text-muted-foreground">{hasEstimate ? 'Estimate only; this may change' : 'No reliable recovery estimate yet'}</dd>
    </div>
  </dl>;
}

function PredictionEvidence({ eta, arrival, station }: { eta: ETA | null; arrival: ReturnType<typeof stationArrival>; station: string }) {
  const metadata = eta?.model_metadata;
  const validation = metadata?.validation;
  const metric = (value?: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${value.toFixed(1)} min` : null;
  const mae = metric(validation?.mae_minutes), baseline = metric(validation?.baseline_mae_minutes), rmse = metric(validation?.rmse_minutes);
  const usesModel = Boolean(arrival.predictedArrival && arrival.method === 'inference');
  return <section className="mt-7 rounded-2xl border border-border bg-background/50 p-5" aria-label="Why this arrival time">
    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">Why this arrival time?</h3>
    <div aria-live="polite" className="mt-3 space-y-3">
      <p className="font-semibold text-foreground">{arrival.title}</p>
      <p className="text-sm leading-6 text-foreground">{arrival.summary}</p>
      {arrival.timing ? <TimingSummary timing={arrival.timing} station={station} /> : null}
      {arrival.details.length ? <ul className="space-y-2 text-sm leading-6 text-muted-foreground list-disc pl-4">{arrival.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul> : null}
      <p className="text-xs text-muted-foreground">{arrival.basis}</p>
    </div>
    <details className="mt-4 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
      <summary className="cursor-pointer font-medium">How this estimate was made</summary>
      <div className="mt-3 space-y-2">
        {arrival.observed ? <p>Last train update: {time(arrival.observed)}.</p> : <p>A dated running update is unavailable.</p>}
        {arrival.predictedArrival && eta?.prediction_generated_at ? <p>Estimate calculated: {time(eta.prediction_generated_at)}.</p> : null}
        {usesModel ? <>
          <p>Past journeys help estimate how the delay may change before this stop. This is an estimate, so the arrival time can change with new updates.</p>
          {metadata?.name ? <p>Model: {metadata.name}</p> : null}
          {metadata?.training_cutoff ? <p>Training records through: {time(metadata.training_cutoff)}</p> : null}
          {mae || rmse ? <div className="border-t border-border pt-2 space-y-1">
            <p>Tests on past journeys: average arrival error {mae || 'unavailable'}{baseline ? `; previous method ${baseline}` : ''}.</p>
            {rmse ? <p>RMSE: {rmse}.</p> : null}
            {typeof validation?.test_journeys === 'number' && Number.isInteger(validation.test_journeys) && validation.test_journeys > 0 ? <p>Tested on {validation.test_journeys.toLocaleString('en-IN')} separate journeys. This does not measure the accuracy of this specific arrival.</p> : null}
          </div> : null}
        </> : arrival.predictedArrival ? <p>The scheduled arrival has been adjusted using the latest reported running delay. Future time recovery or additional delays are not predicted for this stop.</p> : null}
      </div>
    </details>
  </section>;
}

export function PassengerJourney({ number, date = '', target = '', compact = false, autoRefresh = false, suppliedJourney, refreshing = false, onRefresh }: { number: string; date?: string; target?: string; compact?: boolean; autoRefresh?: boolean; suppliedJourney?: Journey; refreshing?: boolean; onRefresh?: () => void }) {
  const refreshInterval = useLiveRefresh();
  const [localJourney, setJourney] = useState<Journey | null>(null), [error, setError] = useState('');
  const [localLoading, setLoading] = useState(true), [revision, refresh] = useState(0);
  const journey = suppliedJourney ?? localJourney;
  const loading = suppliedJourney ? refreshing : localLoading;
  const [stationChoice, select] = useState<{ journey: string; value: string } | null>(null), [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (suppliedJourney) return;
    const controller = new AbortController();
    setLoading(true); setJourney(null); setError('');
    loadJourney(number, date, controller.signal).then(data => { if (!controller.signal.aborted) setJourney(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) { setLoading(false); setNow(Date.now()); } });
    return () => controller.abort();
  }, [number, date, revision, suppliedJourney]);
  useEffect(() => {
    // Observation age keeps advancing without another API request.
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (suppliedJourney || !autoRefresh || refreshInterval === 0) return;
    let appActive = true;
    const pause = () => { appActive = false; };
    const resume = () => { appActive = true; };
    const timer = setInterval(() => {
      if (appActive && document.visibilityState === 'visible') refresh(n => n + 1);
    }, refreshInterval);
    window.addEventListener('journey-pause', pause);
    window.addEventListener('journey-resume', resume);
    return () => { clearInterval(timer); window.removeEventListener('journey-pause', pause); window.removeEventListener('journey-resume', resume); };
  }, [autoRefresh, suppliedJourney, refreshInterval]);
  const status = journey?.status, eta = journey?.eta || null;
  const predictions = eta?.remaining_stations || [];
  const selectionJourney = `${number}|${status?.date || date}|${target}`;
  const selected = stationChoice?.journey === selectionJourney ? stationChoice.value : target;
  const stationCounts = new Map<string, number>();
  for (const item of predictions) {
    if (item.station) stationCounts.set(item.station.code, (stationCounts.get(item.station.code) || 0) + 1);
  }
  const defaultPrediction = predictions.find(p => usablePrediction(eta, p)) || predictions.at(-1);
  const selection = selected || (defaultPrediction ? predictionKey(defaultPrediction) : '');
  const prediction = selectedPrediction(predictions, selection);
  const destination = prediction?.station?.code || '';
  const stop = matchingStop(status, prediction);
  const arrival = stationArrival(eta, status, prediction, now);
  const observed = arrival.observed;
  const hasPrediction = Boolean(arrival.predictedArrival);
  return <section className="space-y-5" aria-busy={loading} aria-label="Train ETA and status">
    <div className="rounded-3xl border border-primary/25 bg-card overflow-hidden shadow-sm">
      <div className="bg-primary/5 px-5 sm:px-8 py-5 flex flex-wrap justify-between gap-3 items-center border-b border-primary/15">
        <div><p className="text-xs uppercase tracking-[.16em] font-semibold text-primary mb-2">Arrival intelligence · {number}</p><h2 className="text-xl font-semibold">{status?.train_name || `Train ${number}`}</h2></div>
        <button disabled={loading} onClick={() => onRefresh ? onRefresh() : refresh(n => n + 1)} className="flex items-center gap-2 border border-border bg-card rounded-full px-4 py-2 text-sm disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      <div className="p-5 sm:p-8">
        {loading && !journey ? <div role="status" className="py-10 flex gap-3 items-center text-muted-foreground"><Clock3 className="animate-pulse" />Fetching the latest available arrival information…</div> : <>
          {(error || journey?.statusError) && <p role="alert" className="mb-4 text-destructive">{error || journey?.statusError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <label className="text-sm text-muted-foreground">Arrival at<select aria-label="Arrival station" className="block mt-2 max-w-full rounded-xl border border-border bg-background text-foreground px-3 py-2" value={prediction ? predictionKey(prediction) : selection} onChange={e => select({ journey: selectionJourney, value: e.target.value })}>
              {!predictions.length && <option value="">Station unavailable</option>}
              {predictions.map((p, i) => p.station && <option key={`${predictionKey(p)}-${i}`} value={predictionKey(p)}>{p.station.name} · {p.station.code}{(stationCounts.get(p.station.code) || 0) > 1 ? ` · Stop ${i + 1}` : ''}</option>)}
            </select></label>
            <span className="text-xs rounded-full bg-muted px-3 py-2">{arrival.stale ? 'Waiting for a newer update' : status?.data_source === 'live' ? 'Latest running update' : status?.data_source || 'Data unavailable'}</span>
          </div>
          <div className="grid sm:grid-cols-[1.5fr_1fr] gap-6">
            <div><p className="text-sm font-medium text-primary mb-2">{arrival.actualArrival ? 'Actual arrival' : 'Expected arrival'}</p><p className="text-3xl sm:text-4xl xl:text-5xl font-semibold tracking-tight leading-tight tabular-nums">{arrival.actualArrival ? time(arrival.actualArrival) : hasPrediction ? time(arrival.predictedArrival) : 'ETA unavailable'}</p>
              {(hasPrediction || arrival.actualArrival) && <p className={`mt-4 font-semibold ${arrival.delayMinutes !== null && arrival.delayMinutes > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{delayLabel(arrival.delayMinutes)}</p>}
              {!hasPrediction && !arrival.actualArrival && <p className="text-sm text-muted-foreground mt-3">{journey?.etaError || 'The scheduled time is shown separately below.'}</p>}
            </div>
            <div className="sm:border-l border-border sm:pl-6 space-y-4"><div><p className="text-sm text-muted-foreground">Scheduled arrival</p><p className="text-xl font-medium mt-1 tabular-nums">{time(prediction?.scheduled_arrival || stop?.scheduled_arrival)}</p></div><div><p className="text-sm text-muted-foreground">Latest reported timing</p><p className="font-medium mt-1">{delayLabel(status?.last_known_location?.delay_minutes)}</p></div></div>
          </div>
          <PredictionEvidence eta={eta} arrival={arrival} station={prediction?.station?.name || destination || 'this station'} />
          <ArrivalWeather number={number} date={status?.date || date} station={destination} predicted={arrival.predictedArrival} />
          <EtaFeedback
            trainNumber={number}
            destination={destination}
            predictedEta={arrival.predictedArrival || undefined}
            date={status?.date || date}
          />
          <IncidentReport
            trainNumber={number}
            date={status?.date || date}
            currentStation={status?.current_station?.name}
          />
          <div className="mt-5 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-2"><span>Status: <strong className="text-foreground">{status?.status || 'Unavailable'}</strong></span><span>Last reported at: <strong className="text-foreground">{status?.current_station?.name || 'Unavailable'}</strong></span><span>Journey started: {status?.date || date || 'Unavailable'}</span></div>
        </>}
      </div>
    </div>
    {status && <details open={compact ? undefined : true} className="rounded-2xl border border-border bg-card"><summary className="cursor-pointer p-5 font-semibold text-primary">View route & intermediate stations</summary><RouteTimeline key={`${number}-${status.date}-${status.route.map(s => s.station?.code).join(',')}`} route={status.route} current={status.current_station?.code} observed={observed} now={now} /></details>}
  </section>;
}

export function RouteTimeline({ route, current, observed, now }: { route: Stop[]; current?: string; observed?: string | null; now?: number }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const anchors = route.flatMap((s, i) => i === 0 || i === route.length - 1 || !passing(s) ? [i] : []);
  function row(index: number) {
    const s = route[index]; const isCurrent = s.station?.code === current;
    const actualArrival = confirmedStopTime(s, 'arrival', observed, now);
    const actualDeparture = confirmedStopTime(s, 'departure', observed, now);
    return <div key={index} aria-current={isCurrent ? 'location' : undefined} className={`${timeline.grid} ${timeline.stop} ${isCurrent ? timeline.current : ''}`}>
      <div className={`${timeline.time} ${timeline.arrival}`}><span className={timeline.timeLabel}>Arrival · IST</span><p>{time(s.scheduled_arrival)}</p>{actualArrival && <p className={timeline.actual}>Actual {time(actualArrival)}</p>}</div>
      <div aria-hidden="true" className={`${timeline.rail} ${index === 0 ? timeline.first : ''} ${index === route.length - 1 ? timeline.last : ''}`}><span className={isCurrent ? timeline.train : timeline.dot}>{isCurrent && <TrainFront size={22} strokeWidth={2.2} />}</span></div>
      <div className={timeline.station}><p className={timeline.name}>{s.station?.name || 'Station unavailable'}</p><p className={timeline.meta}>{s.station?.code}{s.platform ? ` · Platform ${s.platform}` : ''}</p>{isCurrent && <span className={timeline.position}>Last reported position</span>}</div>
      <div className={`${timeline.time} ${timeline.departure}`}><span className={timeline.timeLabel}>Departure · IST</span><p>{time(s.scheduled_departure)}</p>{actualDeparture && <p className={timeline.actual}>Actual {time(actualDeparture)}</p>}</div>
    </div>;
  }
  return <section className={timeline.timeline} aria-label="Stations on your route"><div className={timeline.heading}><h2>Stations on your route</h2><p>Expand a stop group to see intermediate stations. The train badge marks the last reported position.</p></div><div aria-hidden="true" className={`${timeline.grid} ${timeline.columns}`}><span>Arrival · IST</span><span className={timeline.stationColumn}>Station & platform</span><span className={timeline.departureColumn}>Departure · IST</span></div>
    {!route.length && <p className={timeline.empty}>Route unavailable.</p>}
    {anchors.map((index, j) => { const end = anchors[j + 1]; const between = end === undefined ? [] : route.slice(index + 1, end); const opened = expanded.has(index); return <div key={index}>{row(index)}{between.length > 0 && <>
      <div className={`${timeline.grid} ${timeline.gap}`}><div aria-hidden="true" className={timeline.rail} /><button aria-expanded={opened} onClick={() => setExpanded(old => { const next = new Set(old); if (next.has(index)) next.delete(index); else next.add(index); return next; })} className={timeline.toggle}><ChevronDown size={16} className={timeline.chevron} />{opened ? 'Hide' : 'Show'} {between.length} intermediate stations<span className="sr-only"> between {route[index].station?.name} and {route[end].station?.name}</span></button></div>
      {between.map((s, offset) => opened || s.station?.code === current ? row(index + 1 + offset) : null)}
    </>}</div>; })}
  </section>;
}
