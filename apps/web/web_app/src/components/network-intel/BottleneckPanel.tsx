'use client';

import React from 'react';
import { BottleneckResponse } from '@/types/api';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface BottleneckPanelProps {
  bottlenecks: BottleneckResponse[];
  isLoading: boolean;
  isUnavailable: boolean;
}

export const BottleneckPanel: React.FC<BottleneckPanelProps> = ({
  bottlenecks,
  isLoading,
  isUnavailable,
}) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 mb-4">
            <div className="h-10 w-10 bg-muted rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors h-full">
      <div className="p-5 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Top Network Bottlenecks</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Highest-impact sections requiring attention</p>
      </div>

      <div className="p-4">
        {isUnavailable ? (
          <div className="py-8 text-center">
            <div className="text-sm font-medium text-foreground mb-1">Network impact analysis unavailable</div>
            <p className="text-xs text-muted-foreground">
              Additional network intelligence data is required for this analysis.
            </p>
          </div>
        ) : bottlenecks.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-sm font-medium text-foreground mb-1">No active bottlenecks</div>
            <p className="text-xs text-muted-foreground">
              The network currently has no significant congestion points.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bottlenecks.slice(0, 5).map((b, idx) => {
              const isCritical = b.risk === 'high' || b.risk === 'critical';
              const isWarning = b.risk === 'medium';

              return (
                <div
                  key={idx}
                  className="flex gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border"
                >
                  {/* Rank badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isCritical ? 'bg-destructive/10 text-destructive' :
                    isWarning ? 'bg-warning/10 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-foreground truncate">{b.location}</div>
                      {isCritical ? (
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{b.reason}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className={`font-semibold capitalize ${isCritical ? 'text-destructive' : isWarning ? 'text-warning' : 'text-muted-foreground'}`}>
                        {b.risk} risk
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{b.time_window}</span>
                      {b.affected_trains > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{b.affected_trains} trains</span>
                        </>
                      )}
                    </div>
                    {b.confidence !== null && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isCritical ? 'bg-destructive' : 'bg-warning'}`}
                            style={{ width: `${Math.round((b.confidence ?? 0) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {Math.round((b.confidence ?? 0) * 100)}% conf.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
