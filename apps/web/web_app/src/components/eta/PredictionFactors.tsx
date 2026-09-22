'use client';

import React from 'react';
import { ETAResponse, DelayFactor } from '@/types/api';

interface PredictionFactorsProps {
  eta: ETAResponse;
}

function getImpactBarWidth(contribution: number, maxContribution: number): number {
  if (maxContribution === 0) return 0;
  return Math.round((contribution / maxContribution) * 100);
}

function getFactorSeverityColor(minutes: number): string {
  if (minutes >= 10) return 'bg-destructive';
  if (minutes >= 5) return 'bg-warning';
  return 'bg-primary';
}

export const PredictionFactors: React.FC<PredictionFactorsProps> = ({ eta }) => {
  const factors = eta.delay_factors;
  const hasFactors = factors && factors.length > 0;
  const maxContribution = hasFactors
    ? Math.max(...factors.map((f) => Math.abs(f.contribution_minutes)))
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full">
      <h2 className="text-base font-semibold text-foreground mb-1">Why This ETA?</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Factors contributing to the current prediction
      </p>

      {!hasFactors ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="text-muted-foreground text-sm font-medium mb-1">No delay factors reported</div>
          <p className="text-xs text-muted-foreground">
            The prediction system has not identified any significant contributing factors.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {factors.map((factor, idx) => {
            const barWidth = getImpactBarWidth(factor.contribution_minutes, maxContribution);
            const barColor = getFactorSeverityColor(factor.contribution_minutes);

            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {factor.factor.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                    factor.contribution_minutes >= 10 ? 'bg-destructive/10 text-destructive' :
                    factor.contribution_minutes >= 5 ? 'bg-warning/10 text-warning' :
                    'bg-primary/10 text-primary'
                  }`}>
                    +{factor.contribution_minutes} min
                  </span>
                </div>

                {/* Impact Bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* Description */}
                {factor.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{factor.description}</p>
                )}
              </div>
            );
          })}

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total Attributed Delay</span>
            <span className="text-sm font-bold text-warning tabular-nums">
              +{factors.reduce((sum, f) => sum + f.contribution_minutes, 0)} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
