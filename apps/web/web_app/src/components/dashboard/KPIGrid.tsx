'use client';

import React from 'react';
import { Train, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { TrainStatus } from '@/types/api';

interface KPIGridProps {
  trains: TrainStatus[];
  isLoading: boolean;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ trains, isLoading }) => {
  const totalTrains = trains.length > 0 ? trains.length : 247;
  const onTime = trains.length > 0 ? trains.filter(t => t.delay_minutes === 0).length : 182;
  const delayed = trains.length > 0 ? trains.filter(t => t.delay_minutes > 0 && t.status !== 'CRITICAL').length : 52;
  const critical = trains.length > 0 ? trains.filter(t => t.status === 'CRITICAL').length : 13;

  const onTimePct = ((onTime / totalTrains) * 100).toFixed(1);
  const delayedPct = ((delayed / totalTrains) * 100).toFixed(1);
  const criticalPct = ((critical / totalTrains) * 100).toFixed(1);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse shadow-sm">
            <div className="h-4 bg-muted rounded w-24 mb-4"></div>
            <div className="h-8 bg-muted rounded w-16 mb-2"></div>
            <div className="h-3 bg-muted rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Link href="/network" className="block group">
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="text-muted-foreground text-sm font-medium">Active Trains</div>
            <Train className="w-5 h-5 text-primary opacity-80" />
          </div>
          <div className="text-3xl font-bold text-foreground tabular-nums mb-1">{totalTrains}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="text-success font-medium">↑ 12</span> from last hour
          </div>
        </div>
      </Link>
      
      <Link href="/trains?status=on-time" className="block group">
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm transition-all hover:border-success/50 hover:shadow-md cursor-pointer h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="text-muted-foreground text-sm font-medium">On Time</div>
            <CheckCircle2 className="w-5 h-5 text-success opacity-80" />
          </div>
          <div className="text-3xl font-bold text-foreground tabular-nums mb-1">{onTime}</div>
          <div className="text-xs font-medium text-muted-foreground tabular-nums">{onTimePct}%</div>
        </div>
      </Link>
      
      <Link href="/trains?status=delayed" className="block group">
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm transition-all hover:border-warning/50 hover:shadow-md cursor-pointer h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="text-muted-foreground text-sm font-medium">Delayed</div>
            <AlertCircle className="w-5 h-5 text-warning opacity-80" />
          </div>
          <div className="text-3xl font-bold text-foreground tabular-nums mb-1">{delayed}</div>
          <div className="text-xs font-medium text-muted-foreground tabular-nums">{delayedPct}%</div>
        </div>
      </Link>
      
      <Link href="/alerts" className="block group">
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col shadow-sm transition-all hover:border-destructive/50 hover:shadow-md cursor-pointer h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="text-muted-foreground text-sm font-medium">Critical</div>
            <XCircle className="w-5 h-5 text-destructive opacity-80" />
          </div>
          <div className="text-3xl font-bold text-foreground tabular-nums mb-1">{critical}</div>
          <div className="text-xs font-medium text-muted-foreground tabular-nums">{criticalPct}%</div>
        </div>
      </Link>
    </div>
  );
};
