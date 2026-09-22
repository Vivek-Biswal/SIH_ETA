'use client';

import React from 'react';
import { TrainStatus, ETAResponse } from '@/types/api';
import { TrendingDown, TrendingUp, Minus, Lightbulb } from 'lucide-react';

interface OperationalStatusProps {
  train: TrainStatus;
  eta: ETAResponse;
}

export const OperationalStatus: React.FC<OperationalStatusProps> = ({ train, eta }) => {
  const isDelayed = train.delay_minutes > 0;
  const isCritical = train.status === 'CRITICAL';
  const isOnTime = !isDelayed && !isCritical;

  // Infer delay trend from factors – if total attributed delay is less than overall, train is recovering
  const totalAttributed = eta.delay_factors?.reduce((s, f) => s + f.contribution_minutes, 0) ?? 0;
  const overallDelay = eta.overall_delay_minutes ?? train.delay_minutes;
  const isImproving = overallDelay > 0 && totalAttributed < overallDelay;
  const isWorsening = totalAttributed > overallDelay;

  const trendIcon = isImproving ? <TrendingDown className="w-4 h-4 text-success" /> :
    isWorsening ? <TrendingUp className="w-4 h-4 text-destructive" /> :
    <Minus className="w-4 h-4 text-muted-foreground" />;

  const trendLabel = isImproving ? 'Improving' : isWorsening ? 'Worsening' : 'Stable';
  const trendColor = isImproving ? 'text-success' : isWorsening ? 'text-destructive' : 'text-muted-foreground';

  // Build operational insight text from actual data
  const insightText = isCritical
    ? `Train ${train.train_number} has a critical operational status. Significant disruption is expected. Monitor for updates.`
    : isDelayed
    ? `The train is currently running ${train.delay_minutes} minute${train.delay_minutes !== 1 ? 's' : ''} late. ${isImproving ? 'The delay appears to be reducing.' : isWorsening ? 'The delay may increase further.' : 'Delay is holding steady.'}`
    : `Train ${train.train_number} is currently operating on time. No significant delays are expected.`;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
      <h2 className="text-base font-semibold text-foreground mb-5">Operational Status</h2>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Current Status</div>
          <div className={`text-sm font-bold ${isCritical ? 'text-destructive' : isDelayed ? 'text-warning' : 'text-success'}`}>
            {isCritical ? 'Critical' : isDelayed ? 'Delayed' : 'On Time'}
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Delay Trend</div>
          <div className={`flex items-center gap-1.5 ${trendColor}`}>
            {trendIcon}
            <span className="text-sm font-bold">{trendLabel}</span>
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Total Delay</div>
          <div className={`text-sm font-bold tabular-nums ${isDelayed ? 'text-warning' : 'text-success'}`}>
            {isDelayed ? `+${overallDelay} min` : 'None'}
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-3">
          <div className="text-xs text-muted-foreground font-medium mb-1">Data Date</div>
          <div className="text-sm font-bold text-foreground tabular-nums">
            {eta.date || 'Today'}
          </div>
        </div>
      </div>

      {/* Station-by-station delays summary */}
      {eta.remaining_stations.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Upcoming Delay Profile
          </div>
          <div className="space-y-1.5">
            {eta.remaining_stations.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium truncate">
                  {s.station?.name || s.station?.code}
                </span>
                <span className={`font-semibold tabular-nums ml-3 flex-shrink-0 ${s.predicted_delay_minutes > 0 ? 'text-warning' : 'text-success'}`}>
                  {s.predicted_delay_minutes > 0 ? `+${s.predicted_delay_minutes}m` : 'On time'}
                </span>
              </div>
            ))}
            {eta.remaining_stations.length > 4 && (
              <div className="text-xs text-muted-foreground mt-1">
                +{eta.remaining_stations.length - 4} more stations
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operational Insight */}
      <div className="mt-auto bg-primary/5 border border-primary/15 rounded-lg p-4 flex gap-3">
        <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-semibold text-foreground mb-1">Operational Insight</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{insightText}</p>
        </div>
      </div>
    </div>
  );
};
