'use client';

import React, { useEffect, useState, use } from 'react';
import { RailwayApiService } from '@/services/api';
import { ETAResponse, TrainStatus } from '@/types/api';

import { TrainOverviewCard } from '@/components/eta/TrainOverviewCard';
import { ETAPredictionCard } from '@/components/eta/ETAPredictionCard';
import { JourneyTimeline } from '@/components/eta/JourneyTimeline';
import { PredictionFactors } from '@/components/eta/PredictionFactors';
import { OperationalStatus } from '@/components/eta/OperationalStatus';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TrainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [train, setTrain] = useState<TrainStatus | null>(null);
  const [eta, setEta] = useState<ETAResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [etaError, setEtaError] = useState<string | null>(null);

  useEffect(() => {
    const trainId = resolvedParams.id;

    Promise.all([
      RailwayApiService.getTrainStatus(trainId).catch(() => null),
      RailwayApiService.getTrainETA(trainId).catch(() => null),
    ]).then(([trainData, etaData]) => {
      setTrain(trainData);
      if (etaData) {
        setEta(etaData);
      } else {
        setEtaError('ETA prediction unavailable for this train.');
      }
      setIsLoading(false);
    });
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto pb-8 space-y-6">
        <div className="h-8 bg-muted rounded w-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6 h-64 animate-pulse" />
          <div className="bg-card border border-border rounded-xl p-6 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!train) {
    return (
      <div className="max-w-7xl mx-auto pb-8">
        <div className="bg-card border border-border rounded-xl p-16 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-2">Train Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">Could not load data for train {resolvedParams.id}.</p>
          <Link href="/trains" className="text-sm font-medium text-primary hover:underline">
            ← Back to ETA Intelligence
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/trains"
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          ETA Intelligence
        </Link>
        <span className="text-border">/</span>
        <span className="text-sm font-semibold text-foreground">{train.train_number} · {train.train_name}</span>
      </div>

      {/* Row 1: Train Overview + ETA Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrainOverviewCard train={train} eta={eta} />

        {eta ? (
          <ETAPredictionCard train={train} eta={eta} />
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <h3 className="text-base font-semibold text-foreground mb-2">ETA Prediction Unavailable</h3>
            <p className="text-sm text-muted-foreground mb-2">{etaError}</p>
            {train.predicted_next_arrival && (
              <div className="text-xs text-muted-foreground">
                Scheduled: <span className="font-semibold text-foreground">{train.predicted_next_arrival}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Journey Timeline */}
      {eta && <JourneyTimeline train={train} eta={eta} />}

      {/* Row 3: Factors + Operational Status */}
      {eta && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PredictionFactors eta={eta} />
          <OperationalStatus train={train} eta={eta} />
        </div>
      )}
    </div>
  );
}
