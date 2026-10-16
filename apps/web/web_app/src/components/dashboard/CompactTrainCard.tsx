'use client';

import { useEffect, useState } from 'react';
import { Clock3, RefreshCw, AlertCircle, TrainFront, ArrowRight } from 'lucide-react';
import { delayLabel, loadJourney, time, usablePrediction, type Journey } from '@/services/passenger';
import Link from 'next/link';
import { stationArrival } from '@/services/etaReason';

export function CompactTrainCard({ number, date = '', onClose }: { number: string; date?: string; onClose?: () => void }) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setJourney(null); setError('');
    loadJourney(number, date, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setJourney(data); setNow(Date.now()); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [number, date, revision]);

  const status = journey?.status;
  const eta = journey?.eta || null;
  const predictions = eta?.remaining_stations || [];
  const defaultPrediction = predictions.find(p => usablePrediction(eta, p)) || predictions.at(-1);
  const stop = status?.route?.find(s => s.station?.code === defaultPrediction?.station?.code);
  const arrival = stationArrival(eta, status, defaultPrediction, now);
  const hasPrediction = Boolean(arrival.predictedArrival);

  if (loading) {
    return (
      <div role="status" aria-label="Loading selected train" className="w-full rounded-2xl border border-primary/20 bg-card p-6 shadow-sm animate-pulse">
        <div className="flex gap-4 items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-muted"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-20 bg-muted rounded-xl w-full"></div>
      </div>
    );
  }

  if (error || journey?.statusError) {
    return (
      <div className="w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-6 flex gap-4 items-start">
        <AlertCircle className="text-destructive shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-destructive">Information unavailable</h3>
          <p className="text-sm text-destructive/80 mt-1">{error || journey?.statusError}</p>
          {onClose && <button onClick={onClose} className="mt-3 text-sm underline">Close result</button>}
        </div>
      </div>
    );
  }

  const isRunning = ['running', 'in-transit', 'arrived', 'at-station', 'departed', 'halted', 'stopped', 'delayed'].includes(status?.status?.toLowerCase().replaceAll('_', '-') || '');
  const isCancelled = ['cancelled', 'canceled'].includes(status?.status?.toLowerCase() || '');
  const origin = status?.route?.[0]?.station?.name || 'Origin';
  const destination = status?.route?.[status.route.length - 1]?.station?.name || 'Destination';

  return (
    <div className="w-full rounded-[22px] border border-border bg-card overflow-hidden shadow-sm">
      <div className="p-5 sm:p-7 relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-3 rounded-xl hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring">
            <span className="sr-only">Close</span>
            &times;
          </button>
        )}
        
        <div className="flex items-start gap-3 sm:gap-4 mb-6">
          <div className="rounded-xl bg-primary/8 p-3 text-primary shrink-0 flex flex-col items-center justify-center">
            <TrainFront size={24} />
            <span className="text-[10px] font-bold mt-1">{number}</span>
          </div>
          <div className="flex-1 min-w-0 pr-9">
            <h2 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground break-words">{status?.train_name || `Train ${number}`}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 font-medium">
              <span className="truncate">{origin}</span>
              <ArrowRight size={14} className="shrink-0" />
              <span className="truncate">{destination}</span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-muted/40 p-4 border border-border/50">
            <p className="text-[11px] text-muted-foreground font-medium mb-2">Last reported status</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500' : isCancelled ? 'bg-destructive' : 'bg-slate-400'}`}></span>
              <p className="text-base font-semibold text-foreground capitalize">
                {status?.status?.replaceAll('_', ' ').replaceAll('-', ' ') || 'Unknown'}
              </p>
            </div>
            {typeof status?.last_known_location?.delay_minutes === 'number' && (
              <p className="text-xs mt-2 text-muted-foreground font-medium">
                Last reported: {delayLabel(status.last_known_location.delay_minutes)}
              </p>
            )}
          </div>
          
          <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
            <p className="text-[11px] text-primary font-medium mb-2">
              Arrival at {defaultPrediction?.station?.name || 'Unknown'}
            </p>
            <div className="mt-1">
              <p className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {arrival.actualArrival ? time(arrival.actualArrival) : hasPrediction ? time(arrival.predictedArrival) : 'ETA unavailable'}
              </p>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">{arrival.actualArrival ? 'Confirmed arrival' : hasPrediction ? 'Expected arrival' : `Scheduled: ${time(defaultPrediction?.scheduled_arrival || stop?.scheduled_arrival)}`}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between mt-4">
          <button onClick={() => setRevision(r => r + 1)} className="text-sm flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          
          <Link href={`/trains/${number}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            View full ETA <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
