'use client';

import { useEffect, useState } from 'react';
import { Clock3, RefreshCw, AlertCircle, TrainFront, ArrowRight } from 'lucide-react';
import { delayLabel, loadJourney, time, usablePrediction, type Journey } from '@/services/passenger';
import Link from 'next/link';

export function CompactTrainCard({ number, date = '', onClose }: { number: string; date?: string; onClose?: () => void }) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setJourney(null); setError('');
    loadJourney(number, date, controller.signal)
      .then(data => { if (!controller.signal.aborted) setJourney(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [number, date, revision]);

  const status = journey?.status;
  const eta = journey?.eta || null;
  const predictions = eta?.remaining_stations || [];
  const defaultPrediction = predictions.find(p => usablePrediction(eta, p)) || predictions.at(-1);
  const stop = status?.route?.find(s => s.station?.code === defaultPrediction?.station?.code);
  const hasPrediction = usablePrediction(eta, defaultPrediction);

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-primary/20 bg-card p-6 shadow-sm animate-pulse">
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
        </div>
      </div>
    );
  }

  const isRunning = status?.status?.toLowerCase().includes('running') || !status?.status?.toLowerCase().includes('cancelled');
  const origin = status?.route?.[0]?.station?.name || 'Origin';
  const destination = status?.route?.[status.route.length - 1]?.station?.name || 'Destination';

  return (
    <div className="w-full rounded-3xl border border-primary/20 bg-gradient-to-b from-card to-card/50 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 sm:p-8 relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors">
            <span className="sr-only">Close</span>
            &times;
          </button>
        )}
        
        <div className="flex items-start gap-4 sm:gap-6 mb-8">
          <div className="rounded-2xl bg-primary/10 p-4 text-primary shrink-0 flex flex-col items-center justify-center">
            <TrainFront size={32} />
            <span className="text-[10px] font-bold mt-1">{number}</span>
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">{status?.train_name || `Train ${number}`}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 font-medium">
              <span className="truncate">{origin}</span>
              <ArrowRight size={14} className="shrink-0" />
              <span className="truncate">{destination}</span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl bg-muted/40 p-5 border border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Current Status</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-destructive'}`}></span>
              <p className="text-base font-semibold text-foreground">
                {status?.status || 'Unknown'}
              </p>
            </div>
            {typeof status?.last_known_location?.delay_minutes === 'number' && (
              <p className="text-sm mt-2 text-amber-600 dark:text-amber-400 font-medium">
                Running {status.last_known_location.delay_minutes} min late
              </p>
            )}
          </div>
          
          <div className="rounded-2xl bg-primary/5 p-5 border border-primary/10">
            <p className="text-xs uppercase tracking-wider text-primary/80 font-semibold mb-1">
              Next Station: {defaultPrediction?.station?.name || 'Unknown'}
            </p>
            <div className="mt-1">
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {hasPrediction ? time(defaultPrediction?.predicted_arrival) : (stop?.scheduled_arrival ? time(stop.scheduled_arrival) : '--:--')}
              </p>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">Expected arrival</p>
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
