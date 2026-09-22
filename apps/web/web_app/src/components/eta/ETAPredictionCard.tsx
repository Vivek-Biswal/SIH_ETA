'use client';

import React from 'react';
import { ETAResponse, TrainStatus } from '@/types/api';

interface ETAPredictionCardProps {
  train: TrainStatus;
  eta: ETAResponse;
}

// Derive confidence label from score (0-1 scale from backend)
function getConfidenceLabel(score: number | null): { label: string; color: string } {
  if (score === null) return { label: 'Unavailable', color: 'text-muted-foreground' };
  const pct = score > 1 ? score : score * 100; // Handle both 0–1 and 0–100
  if (pct >= 90) return { label: 'High confidence', color: 'text-success' };
  if (pct >= 70) return { label: 'Moderate confidence', color: 'text-warning' };
  return { label: 'Low confidence', color: 'text-destructive' };
}

function getConfidencePct(score: number | null): number {
  if (score === null) return 0;
  return score > 1 ? Math.round(score) : Math.round(score * 100);
}

export const ETAPredictionCard: React.FC<ETAPredictionCardProps> = ({ train, eta }) => {
  const nextStation = eta.remaining_stations[0];
  const isDelayed = train.delay_minutes > 0;
  const isCritical = train.status === 'CRITICAL';
  
  const overallConfidence = eta.confidence_score;
  const stationConfidence = nextStation?.prediction_confidence ?? overallConfidence;
  const confidencePct = getConfidencePct(stationConfidence);
  const { label: confidenceLabel, color: confidenceColor } = getConfidenceLabel(stationConfidence);

  const delayColor = isCritical ? 'text-destructive' : isDelayed ? 'text-warning' : 'text-success';

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
        Next Arrival Prediction
      </h2>

      {nextStation ? (
        <>
          {/* Station Name */}
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            {nextStation.station?.name || nextStation.station?.code || train.next_station?.code}
          </div>

          {/* Primary ETA — visually dominant */}
          <div className="mb-6">
            <div className="text-5xl font-bold tabular-nums text-foreground tracking-tight leading-none">
              {nextStation.predicted_arrival}
            </div>
            {isDelayed && (
              <div className={`text-sm font-semibold ${delayColor} mt-2`}>
                +{nextStation.predicted_delay_minutes ?? train.delay_minutes} min expected delay
              </div>
            )}
            {!isDelayed && (
              <div className="text-sm font-medium text-success mt-2">On schedule</div>
            )}
          </div>

          {/* Scheduled vs Predicted */}
          <div className="bg-muted/40 rounded-lg p-4 mb-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground font-medium mb-1">Scheduled</div>
              <div className="text-base font-bold tabular-nums text-foreground">{nextStation.scheduled_arrival}</div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs text-muted-foreground font-medium mb-1">Predicted</div>
              <div className={`text-base font-bold tabular-nums ${isDelayed ? delayColor : 'text-success'}`}>
                {nextStation.predicted_arrival}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium mb-1">Difference</div>
              <div className={`text-base font-bold tabular-nums ${isDelayed ? delayColor : 'text-success'}`}>
                {isDelayed ? `+${nextStation.predicted_delay_minutes ?? train.delay_minutes}m` : '0m'}
              </div>
            </div>
          </div>

          {/* Confidence */}
          {stationConfidence !== null && (
            <div className="mt-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">Prediction Confidence</div>
                <div className={`text-sm font-bold tabular-nums ${confidenceColor}`}>{confidencePct}%</div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all ${confidencePct >= 90 ? 'bg-success' : confidencePct >= 70 ? 'bg-warning' : 'bg-destructive'}`}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
              <div className={`text-xs ${confidenceColor} font-medium mt-1`}>{confidenceLabel}</div>
              
              {confidencePct >= 85 && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Prediction is supported by recent movement data and stable section conditions.
                </p>
              )}
            </div>
          )}

          {/* Model metadata */}
          {eta.model_version && (
            <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
              <span>Model: <span className="font-medium text-foreground font-mono">{eta.model_version}</span></span>
              <span>{eta.prediction_generated_at ? `Updated ${eta.prediction_generated_at}` : ''}</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <div className="text-muted-foreground text-sm font-medium">Prediction unavailable</div>
          <p className="text-xs text-muted-foreground">
            Scheduled arrival: <span className="font-medium text-foreground">{train.predicted_next_arrival || 'N/A'}</span>
          </p>
        </div>
      )}
    </div>
  );
};
