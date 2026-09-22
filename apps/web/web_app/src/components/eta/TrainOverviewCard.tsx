'use client';

import React from 'react';
import { TrainStatus, ETAResponse } from '@/types/api';
import { MapPin, Navigation, Gauge, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TrainOverviewCardProps {
  train: TrainStatus;
  eta: ETAResponse | null;
}

export const TrainOverviewCard: React.FC<TrainOverviewCardProps> = ({ train, eta }) => {
  const isDelayed = train.delay_minutes > 0;
  const isCritical = train.status === 'CRITICAL';

  const statusBg = isCritical ? 'bg-destructive/10 text-destructive border-destructive/20'
    : isDelayed ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-success/10 text-success border-success/20';

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">{train.train_name}</h2>
          <p className="text-muted-foreground font-mono text-sm mt-0.5">{train.train_number}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusBg}`}>
          {isCritical ? 'CRITICAL' : isDelayed ? 'DELAYED' : 'ON TIME'}
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 pb-5 border-b border-border">
        <span className="font-semibold text-foreground">NDLS</span>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-foreground">MMCT</span>
        <span className="ml-1">· Long Distance</span>
      </div>

      {/* Location & Station Info */}
      <div className="grid grid-cols-2 gap-5 flex-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <MapPin className="w-3 h-3" />
            Current Location
          </div>
          <div className="text-base font-bold text-foreground">{train.current_station?.name || train.current_station?.code}</div>
          <div className="text-xs text-muted-foreground font-mono">{train.current_station?.code}</div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <Navigation className="w-3 h-3" />
            Next Station
          </div>
          <div className="text-base font-bold text-foreground">{train.next_station?.name || train.next_station?.code}</div>
          <div className="text-xs text-muted-foreground font-mono">{train.next_station?.code}</div>
        </div>

        {train.speed_kmh !== undefined && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              <Gauge className="w-3 h-3" />
              Speed
            </div>
            <div className="text-base font-bold text-foreground tabular-nums">
              {train.speed_kmh} <span className="text-xs text-muted-foreground font-normal">km/h</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Delay</div>
          <div className={`text-base font-bold tabular-nums ${isDelayed ? (isCritical ? 'text-destructive' : 'text-warning') : 'text-success'}`}>
            {isDelayed ? `+${train.delay_minutes} min` : 'On Time'}
          </div>
        </div>
      </div>

      {/* Zone & Actions */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Zone: <span className="font-medium text-foreground">{train.zone || 'N/A'}</span>
        </div>
        <Link 
          href={`/network/map?train=${train.train_number}`}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          View on Map
        </Link>
      </div>
    </div>
  );
};
