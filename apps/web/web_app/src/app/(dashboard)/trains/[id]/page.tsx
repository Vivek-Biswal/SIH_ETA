'use client';

import React, { useEffect, useState, use } from 'react';
import { RailwayApiService } from '@/services/api';
import { ETAResponse, TrainStatus } from '@/types/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RouteProgress } from '@/components/ui/RouteProgress';
import { ConfidenceGauge } from '@/components/ui/ConfidenceGauge';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Gauge, Lightbulb } from 'lucide-react';

export default function TrainStatusDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [train, setTrain] = useState<TrainStatus | null>(null);
  const [eta, setEta] = useState<ETAResponse | null>(null);

  useEffect(() => {
    RailwayApiService.getTrainStatus(resolvedParams.id).then(setTrain);
    RailwayApiService.getTrainETA(resolvedParams.id).then(setEta);
  }, [resolvedParams.id]);

  if (!train || !eta) {
    return (
      <div className="h-64 flex items-center justify-center bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-xl">
        <div className="animate-pulse text-[var(--color-text-muted)] font-medium">Loading telemetry...</div>
      </div>
    );
  }

  const confidence = eta.remaining_stations.length > 0 ? ((eta.remaining_stations[0].prediction_confidence ?? 0.87) * 100) : 87;

  // Mock route stations for visualization based on reference image
  const routeStations = [
    { code: 'NDLS', name: 'New Delhi' },
    { code: train.current_station?.code || 'BRC', name: train.current_station?.name || 'Vadodara' },
    { code: train.next_station?.code || 'MMCT', name: train.next_station?.name || 'Mumbai Central' },
  ];
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-brand-blue)] flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Train Info Header Card */}
      <div className="bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {train.train_number} - {train.train_name}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--color-text-muted)] font-medium">NDLS → MMCT</span>
            <span className="text-[var(--color-border-subtle)]">|</span>
            <span className={`font-semibold ${train.delay_minutes > 0 ? 'text-[var(--color-warning-amber)]' : 'text-[var(--color-live-green)]'}`}>
              {train.delay_minutes > 0 ? `${train.delay_minutes}h ${train.delay_minutes % 60}m late` : 'On Time'}
            </span>
          </div>
        </div>

        {/* ETA & Current Location Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Expected Arrival */}
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Expected Arrival
            </h2>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                {eta.remaining_stations[0]?.predicted_arrival || '06:45 AM'}
              </span>
              {train.delay_minutes > 0 && (
                <span className="text-lg font-bold text-[var(--color-critical-red)]">
                  (+ {train.delay_minutes} min)
                </span>
              )}
            </div>
          </div>

          {/* Current Location */}
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              Current Location
            </h2>
            <div className="text-lg font-semibold text-[var(--color-text-primary)]">
              {train.current_station.name} ({train.current_station.code})
            </div>
            
            {/* Route Visualization */}
            <div className="mt-4 px-4">
              <RouteProgress stations={routeStations} currentStationIndex={1} />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Delay Trend Chart (Placeholder) */}
        <div className="md:col-span-2 bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
            Delay Trend
          </h2>
          
          <div className="flex-1 min-h-[160px] relative">
            {/* Simple mock chart using SVG */}
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <line x1="0" y1="20" x2="100" y2="20" stroke="var(--color-border-subtle)" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="var(--color-border-subtle)" strokeWidth="0.5" strokeDasharray="2" />
              <line x1="0" y1="80" x2="100" y2="80" stroke="var(--color-border-subtle)" strokeWidth="0.5" strokeDasharray="2" />
              
              <text x="0" y="20" className="text-[5px] fill-[var(--color-text-muted)]">60m</text>
              <text x="0" y="50" className="text-[5px] fill-[var(--color-text-muted)]">30m</text>
              <text x="0" y="80" className="text-[5px] fill-[var(--color-text-muted)]">0m</text>
              
              {/* Predicted Line (Blue) */}
              <polyline 
                points="10,75 30,70 50,60 70,55 90,50" 
                fill="none" 
                stroke="var(--color-brand-blue)" 
                strokeWidth="2" 
              />
              {/* Actual Line (Orange/Red) */}
              <polyline 
                points="10,75 30,72 50,45 70,40" 
                fill="none" 
                stroke="var(--color-critical-red)" 
                strokeWidth="2" 
                strokeDasharray="2"
              />
              
              <circle cx="10" cy="75" r="2" fill="var(--color-brand-blue)" />
              <circle cx="30" cy="70" r="2" fill="var(--color-brand-blue)" />
              <circle cx="50" cy="60" r="2" fill="var(--color-brand-blue)" />
              <circle cx="70" cy="55" r="2" fill="var(--color-brand-blue)" />
              <circle cx="90" cy="50" r="2" fill="var(--color-brand-blue)" />
              
              <circle cx="70" cy="40" r="2" fill="var(--color-critical-red)" />
            </svg>
            <div className="absolute top-0 right-0 flex gap-4 text-xs font-medium text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-brand-blue)]"></span> Predicted
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-critical-red)]"></span> Actual
              </span>
            </div>
            <div className="absolute bottom-0 w-full flex justify-between px-6 text-[10px] text-[var(--color-text-muted)] font-medium">
              <span>8 AM</span>
              <span>10 AM</span>
              <span>12 PM</span>
              <span>2 PM</span>
              <span>4 PM</span>
            </div>
          </div>
        </div>

        {/* Prediction Confidence */}
        <div className="bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider w-full text-center mb-6">
            Prediction Confidence
          </h2>
          <ConfidenceGauge confidence={Math.round(confidence)} />
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
        <div className="bg-green-100 p-2 rounded-full flex-shrink-0 mt-1">
          <Lightbulb className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-green-800 mb-1">Recommendation</h3>
          <p className="text-sm text-green-700">
            Train is likely to arrive {train.delay_minutes} minutes late. Consider alternate connections if required.
          </p>
        </div>
      </div>
    </div>
  );
}
