'use client';

import React from 'react';
import { TrainStatus } from '@/types/api';

interface OnTimePerformanceChartProps {
  trains: TrainStatus[];
  isLoading: boolean;
}

export const OnTimePerformanceChart: React.FC<OnTimePerformanceChartProps> = ({ trains, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-6" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-40 h-40 rounded-full border-8 border-muted mb-6" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
      </div>
    );
  }

  const total = trains.length;
  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">On-Time Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Current snapshot distribution</p>
        </div>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="text-sm font-medium text-foreground mb-1">No trains data</div>
          <p className="text-xs text-muted-foreground">Unable to calculate performance.</p>
        </div>
      </div>
    );
  }

  const critical = trains.filter(t => t.status === 'CRITICAL').length;
  const delayed = trains.filter(t => t.delay_minutes > 0 && t.status !== 'CRITICAL').length;
  const onTime = total - delayed - critical;

  const onTimePct = Math.round((onTime / total) * 100);
  const delayedPct = Math.round((delayed / total) * 100);
  const criticalPct = Math.round((critical / total) * 100);

  // SVG parameters for donut chart
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  const onTimeStroke = (onTimePct / 100) * circumference;
  const delayedStroke = (delayedPct / 100) * circumference;
  const criticalStroke = (criticalPct / 100) * circumference;
  
  const onTimeOffset = 0;
  const delayedOffset = -onTimeStroke;
  const criticalOffset = -(onTimeStroke + delayedStroke);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col">
      <div className="p-5 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">On-Time Performance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Current snapshot distribution</p>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="96" cy="96" r={radius}
              className="fill-none stroke-muted" strokeWidth="16"
            />
            {/* On Time */}
            {onTimePct > 0 && (
              <circle
                cx="96" cy="96" r={radius}
                className="fill-none stroke-success transition-all duration-1000 ease-in-out" 
                strokeWidth="16"
                strokeDasharray={`${onTimeStroke} ${circumference}`}
                strokeDashoffset={onTimeOffset}
              />
            )}
            {/* Delayed */}
            {delayedPct > 0 && (
              <circle
                cx="96" cy="96" r={radius}
                className="fill-none stroke-warning transition-all duration-1000 ease-in-out" 
                strokeWidth="16"
                strokeDasharray={`${delayedStroke} ${circumference}`}
                strokeDashoffset={delayedOffset}
              />
            )}
            {/* Critical */}
            {criticalPct > 0 && (
              <circle
                cx="96" cy="96" r={radius}
                className="fill-none stroke-destructive transition-all duration-1000 ease-in-out" 
                strokeWidth="16"
                strokeDasharray={`${criticalStroke} ${circumference}`}
                strokeDashoffset={criticalOffset}
              />
            )}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-foreground">{onTimePct}%</span>
            <span className="text-xs font-medium text-muted-foreground mt-1">On Time</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-3 gap-2 px-4">
          <div className="flex flex-col items-center text-center p-2 rounded-lg bg-success/10 border border-success/20">
            <div className="text-lg font-bold tabular-nums text-success">{onTimePct}%</div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">On Time</div>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-lg bg-warning/10 border border-warning/20">
            <div className="text-lg font-bold tabular-nums text-warning">{delayedPct}%</div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Delayed</div>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="text-lg font-bold tabular-nums text-destructive">{criticalPct}%</div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Critical</div>
          </div>
        </div>
      </div>
    </div>
  );
};
