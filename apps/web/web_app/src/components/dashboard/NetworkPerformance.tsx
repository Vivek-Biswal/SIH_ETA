'use client';

import React from 'react';
import Link from 'next/link';
import { TrainStatus } from '@/types/api';

export const NetworkPerformance: React.FC<{ trains?: TrainStatus[], isLoading?: boolean }> = ({ trains = [], isLoading = false }) => {
  const delayedTrains = trains.filter(t => t.delay_minutes > 0);
  const onTimePercentage = trains.length > 0 
    ? (((trains.length - delayedTrains.length) / trains.length) * 100).toFixed(1) 
    : '0.0';
  
  const avgDelay = delayedTrains.length > 0
    ? (delayedTrains.reduce((sum, t) => sum + t.delay_minutes, 0) / delayedTrains.length).toFixed(1)
    : '0.0';

  const criticalTrains = trains.filter(t => t.status === 'CRITICAL').length;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors flex flex-col h-full">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Network Snapshot Performance</h2>
        <Link href="/analytics" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          Analytics
        </Link>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">On-Time Performance</div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {isLoading ? '--' : `${onTimePercentage}%`}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Average Delay (Delayed)</div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {isLoading ? '--' : `${avgDelay} min`}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Critical Disruptions</div>
            <div className={`text-xl font-bold tabular-nums ${criticalTrains > 0 ? 'text-destructive' : 'text-success'}`}>
              {isLoading ? '--' : criticalTrains}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-1">Active Trains</div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {isLoading ? '--' : trains.length}
            </div>
          </div>
        </div>

        {/* Unavailable Historical Chart */}
        <div className="mt-2 pt-4 border-t border-border flex-1 flex flex-col items-center justify-center min-h-[120px] bg-muted/20 rounded-lg">
          <div className="text-xs font-medium text-foreground mb-1">Historical Trends Unavailable</div>
          <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
            Time-series delay data is not available in the current live operational feed.
          </p>
        </div>
      </div>
    </div>
  );
};
