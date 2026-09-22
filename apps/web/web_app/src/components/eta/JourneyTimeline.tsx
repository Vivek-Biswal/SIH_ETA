'use client';

import React from 'react';
import { ETAResponse, TrainStatus, RemainingStation } from '@/types/api';
import { MapPin } from 'lucide-react';

interface JourneyTimelineProps {
  train: TrainStatus;
  eta: ETAResponse;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ train, eta }) => {
  // Build timeline: origin + remaining stations
  const completedStation = {
    station: { code: 'NDLS', name: 'New Delhi' },
    scheduled_arrival: eta.date ? '06:00' : '--',
    predicted_arrival: '',
    predicted_delay_minutes: 0,
    prediction_confidence: null,
    isCompleted: true,
    isCurrent: false,
  };

  const currentStation = {
    station: train.current_station,
    scheduled_arrival: train.scheduled_departure || '--',
    predicted_arrival: '',
    predicted_delay_minutes: train.delay_minutes,
    prediction_confidence: null,
    isCompleted: false,
    isCurrent: true,
  };

  const remainingItems = eta.remaining_stations.map((s, i) => ({
    ...s,
    isCompleted: false,
    isCurrent: false,
    isNext: i === 0,
  }));

  const allStations = [completedStation, currentStation, ...remainingItems];

  const totalStations = allStations.length;
  // Progress: completed + current out of total
  const completedCount = 2; // origin + current
  const progressPct = Math.round((completedCount / totalStations) * 100);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-foreground">Journey Timeline</h2>
        
        {/* Journey Progress */}
        <div className="hidden sm:flex flex-col items-end gap-1">
          <div className="text-xs text-muted-foreground font-medium">Journey Progress</div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-foreground">{progressPct}%</span>
          </div>
        </div>
      </div>

      <div className="relative pl-7 space-y-0">
        {/* Vertical connector line */}
        <div className="absolute left-[10px] top-3 bottom-3 w-px bg-border" />

        {allStations.map((station: any, idx) => {
          const isCurrent = station.isCurrent;
          const isCompleted = station.isCompleted;
          const isNext = station.isNext;
          const isLast = idx === allStations.length - 1;

          return (
            <div key={`${station.station?.code}-${idx}`} className={`relative flex gap-4 ${isLast ? '' : 'pb-6'}`}>
              {/* Dot */}
              <div className="absolute -left-7 mt-1">
                {isCurrent ? (
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-card shadow-sm"></span>
                  </span>
                ) : isCompleted ? (
                  <span className="flex h-4 w-4 rounded-full bg-muted border-2 border-border items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"></span>
                  </span>
                ) : isNext ? (
                  <span className="flex h-4 w-4 rounded-full bg-primary/20 border-2 border-primary/50 items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/80"></span>
                  </span>
                ) : (
                  <span className="flex h-4 w-4 rounded-full bg-background border-2 border-border"></span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex justify-between items-start">
                <div>
                  <div className={`text-sm font-semibold ${isCurrent ? 'text-foreground' : isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {station.station?.name || station.station?.code}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">Current</span>
                    )}
                    {isNext && (
                      <span className="ml-2 text-[10px] font-bold text-foreground/60 uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">Next</span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">{station.station?.code}</div>
                </div>

                {/* Time info */}
                <div className="text-right flex-shrink-0 ml-4">
                  {isCompleted && (
                    <div className="text-xs text-muted-foreground">Departed {station.scheduled_arrival}</div>
                  )}
                  {isCurrent && (
                    <div className="flex flex-col items-end">
                      {station.predicted_delay_minutes > 0 && (
                        <span className="text-xs font-semibold text-warning">+{station.predicted_delay_minutes}m delay</span>
                      )}
                    </div>
                  )}
                  {!isCurrent && !isCompleted && (
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="text-xs text-muted-foreground tabular-nums">Sch: {station.scheduled_arrival}</div>
                      {station.predicted_arrival && (
                        <div className={`text-xs font-semibold tabular-nums ${station.predicted_delay_minutes > 0 ? 'text-warning' : 'text-foreground'}`}>
                          ETA: {station.predicted_arrival}
                        </div>
                      )}
                      {station.predicted_delay_minutes > 0 && (
                        <div className="text-[10px] text-warning">+{station.predicted_delay_minutes}m</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
