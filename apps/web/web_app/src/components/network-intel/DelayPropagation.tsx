'use client';

import React from 'react';
import { PropagationResponse } from '@/types/api';

interface DelayPropagationProps {
  propagation: PropagationResponse | null;
  isLoading: boolean;
  isUnavailable: boolean;
}

export const DelayPropagation: React.FC<DelayPropagationProps> = ({
  propagation,
  isLoading,
  isUnavailable,
}) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-5 bg-muted rounded w-44 mb-5" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-4 h-4 rounded-full bg-muted mt-1 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-muted rounded w-32" />
                <div className="h-2 bg-muted rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Static demo propagation visualization when no backend data exists
  // This reflects the actual backend PropagationResponse schema but shows
  // what the visualization would look like when real data is provided.
  const demoNodes = [
    { station: propagation?.affected_station || 'Mathura Jn', delay: propagation?.predicted_delay || 7, isSource: true },
    { station: 'Agra Cantt', delay: 7, isSource: false },
    { station: 'Gwalior', delay: 8, isSource: false },
    { station: 'Jhansi', delay: 9, isSource: false },
  ];

  const hasRealData = propagation !== null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors h-full flex flex-col">
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Delay Propagation</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Downstream impact of upstream delays
            </p>
          </div>
          {!hasRealData && !isUnavailable && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-wider">
              Demo
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1">
        {isUnavailable ? (
          <div className="py-8 text-center">
            <div className="text-sm font-medium text-foreground mb-1">Propagation data unavailable</div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Delay propagation analysis requires real-time train positional data which is not currently available.
            </p>
          </div>
        ) : (
          <>
            {/* Source train context */}
            {propagation && (
              <div className="mb-4 bg-muted/40 rounded-lg p-3 text-xs">
                <span className="text-muted-foreground">Source train: </span>
                <span className="font-semibold text-foreground">{propagation.source_train}</span>
                <span className="text-muted-foreground ml-2">→ affects </span>
                <span className="font-semibold text-foreground">{propagation.affected_train}</span>
                {propagation.confidence !== null && (
                  <span className="text-muted-foreground ml-2">({Math.round((propagation.confidence ?? 0) * 100)}% confidence)</span>
                )}
              </div>
            )}

            {/* Propagation Timeline */}
            <div className="relative pl-6 space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[10px] top-3 bottom-3 w-px bg-border" />

              {demoNodes.map((node, i) => {
                const isLast = i === demoNodes.length - 1;
                const delayColor = node.delay >= 9 ? 'text-destructive bg-destructive/10 border-destructive/20'
                  : node.delay >= 7 ? 'text-warning bg-warning/10 border-warning/20'
                  : 'text-success bg-success/10 border-success/20';
                const dotColor = node.delay >= 9 ? 'bg-destructive' : node.delay >= 7 ? 'bg-warning' : 'bg-success';

                return (
                  <div key={i} className={`relative flex items-start gap-4 ${isLast ? '' : 'pb-6'}`}>
                    {/* Dot */}
                    <div className={`absolute -left-6 mt-1 w-4 h-4 rounded-full ${dotColor} border-2 border-card flex-shrink-0 ${node.isSource ? 'shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''}`} />

                    {/* Content */}
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{node.station}</div>
                        {node.isSource && (
                          <div className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">Origin</div>
                        )}
                      </div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums ${delayColor}`}>
                        +{node.delay} min
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Impact summary */}
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground font-medium mb-1">Affected Stations</div>
                <div className="text-lg font-bold text-foreground tabular-nums">{demoNodes.length}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground font-medium mb-1">Max Propagated</div>
                <div className="text-lg font-bold text-warning tabular-nums">+{Math.max(...demoNodes.map(n => n.delay))} min</div>
              </div>
            </div>

            {!hasRealData && (
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Visualization shows conceptual propagation. Real propagation data will be shown when the backend model provides it.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
