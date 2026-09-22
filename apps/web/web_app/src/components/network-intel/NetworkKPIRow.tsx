'use client';

import React from 'react';
import { TrainStatus, NetworkZoneStatus, RouteCongestionSegment } from '@/types/api';
import { Train, AlertCircle, XCircle, Activity } from 'lucide-react';

interface NetworkKPIRowProps {
  trains: TrainStatus[];
  zones: NetworkZoneStatus[];
  segments: RouteCongestionSegment[];
  isLoading: boolean;
}

export const NetworkKPIRow: React.FC<NetworkKPIRowProps> = ({ trains, zones, segments, isLoading }) => {
  const activeTrains = trains.length;
  const delayedTrains = trains.filter((t) => t.delay_minutes > 0).length;
  const criticalTrains = trains.filter((t) => t.status === 'CRITICAL').length;

  const affectedSegments = segments.filter((s) => s.status !== 'NORMAL').length;
  const criticalSegments = segments.filter((s) => s.status === 'CONFLICT').length;

  const avgDelay = trains.length > 0
    ? (trains.reduce((sum, t) => sum + t.delay_minutes, 0) / trains.length).toFixed(1)
    : '—';

  const kpis = [
    {
      label: 'Active Trains',
      value: isLoading ? '—' : String(activeTrains || '—'),
      icon: <Train className="w-5 h-5 text-primary opacity-80" />,
      sub: 'On network',
    },
    {
      label: 'Affected Trains',
      value: isLoading ? '—' : String(delayedTrains || '—'),
      icon: <AlertCircle className="w-5 h-5 text-warning opacity-80" />,
      sub: 'Delayed or disrupted',
    },
    {
      label: 'Affected Sections',
      value: isLoading ? '—' : String(affectedSegments || zones.filter(z => z.status !== 'HEALTHY').length || '—'),
      icon: <Activity className="w-5 h-5 text-warning opacity-80" />,
      sub: 'With delays',
    },
    {
      label: 'Critical Sections',
      value: isLoading ? '—' : String(criticalSegments || zones.filter(z => z.status === 'DISRUPTED').length || '—'),
      icon: <XCircle className="w-5 h-5 text-destructive opacity-80" />,
      sub: 'Require attention',
    },
    {
      label: 'Avg Network Delay',
      value: isLoading ? '—' : avgDelay === '0.0' ? '0 min' : `${avgDelay} min`,
      icon: null,
      sub: 'Across all trains',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
            {kpi.icon}
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums mb-1">
            {isLoading ? (
              <div className="h-8 bg-muted rounded w-16 animate-pulse" />
            ) : (
              kpi.value
            )}
          </div>
          <div className="text-xs text-muted-foreground">{kpi.sub}</div>
        </div>
      ))}
    </div>
  );
};
