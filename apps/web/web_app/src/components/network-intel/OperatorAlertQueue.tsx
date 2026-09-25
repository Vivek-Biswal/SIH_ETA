'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface OperatorAlertQueueProps {
  alerts: any[];
  isLoading: boolean;
}

export const OperatorAlertQueue: React.FC<OperatorAlertQueueProps> = ({ alerts, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors h-full flex flex-col">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-foreground">Operator Alert Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Critical propagation warnings</p>
        </div>
        <div className="px-2 py-1 bg-destructive/10 text-destructive text-xs font-semibold rounded">
          {alerts.length} Active
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No active alerts in queue.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="bg-muted/30 border border-border rounded-lg p-3">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">
                      {alert.alert_message}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span><span className="font-medium text-foreground">Station:</span> {alert.station}</span>
                      <span><span className="font-medium text-foreground">Source:</span> {alert.source_train} (+{alert.source_arr_delay}m)</span>
                      <span><span className="font-medium text-foreground">Target:</span> {alert.target_train}</span>
                    </div>
                    <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-destructive h-full rounded-full"
                        style={{ width: `${Math.round(alert.risk_score * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
