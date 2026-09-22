'use client';

import React from 'react';
import { TrainStatus } from '@/types/api';
import { Clock, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface AnalyticsKpiRowProps {
  trains: TrainStatus[];
  isLoading: boolean;
}

export const AnalyticsKpiRow: React.FC<AnalyticsKpiRowProps> = ({ trains, isLoading }) => {
  const totalTrains = trains.length;
  const onTimeTrains = trains.filter(t => t.delay_minutes === 0).length;
  const onTimePct = totalTrains > 0 ? ((onTimeTrains / totalTrains) * 100).toFixed(1) : '—';
  
  const avgDelay = totalTrains > 0 
    ? (trains.reduce((sum, t) => sum + t.delay_minutes, 0) / totalTrains).toFixed(1) 
    : '—';

  const kpis = [
    {
      label: 'On-Time Performance',
      value: isLoading ? '—' : `${onTimePct}%`,
      sub: 'Based on current snapshot',
      icon: <CheckCircle2 className="w-5 h-5 text-success opacity-80" />,
      color: 'text-success'
    },
    {
      label: 'Average Delay',
      value: isLoading ? '—' : `${avgDelay} min`,
      sub: 'Based on current snapshot',
      icon: <Clock className="w-5 h-5 text-warning opacity-80" />,
      color: avgDelay !== '—' && parseFloat(avgDelay) > 0 ? 'text-warning' : 'text-success'
    },
    {
      label: 'ETA Accuracy',
      value: 'Unavailable',
      sub: 'Awaiting actual arrival data',
      icon: <AlertTriangle className="w-5 h-5 text-muted-foreground opacity-80" />,
      color: 'text-muted-foreground'
    },
    {
      label: 'Trains Analyzed',
      value: isLoading ? '—' : totalTrains.toString(),
      sub: 'In current snapshot',
      icon: <TrendingUp className="w-5 h-5 text-primary opacity-80" />,
      color: 'text-foreground'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, idx) => (
        <div key={idx} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-muted-foreground">
            <span className="text-xs font-medium">{kpi.label}</span>
            {kpi.icon}
          </div>
          <div className={`text-2xl font-bold tabular-nums mb-1 ${kpi.color}`}>
            {isLoading ? (
              <div className="h-8 bg-muted rounded w-20 animate-pulse" />
            ) : (
              kpi.value
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {kpi.sub}
          </div>
        </div>
      ))}
    </div>
  );
};
