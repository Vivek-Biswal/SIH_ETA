'use client';

import React from 'react';
import { TrainStatus } from '@/types/api';
import { RefreshCw } from 'lucide-react';

interface NetworkStatusBarProps {
  trains: TrainStatus[];
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ 
  trains, 
  lastUpdated, 
  onRefresh, 
  isRefreshing 
}) => {
  const activeTrains = trains.length;
  const onTime = trains.filter(t => t.delay_minutes === 0).length;
  const delayed = trains.filter(t => t.delay_minutes > 0 && t.status !== 'CRITICAL').length;
  const critical = trains.filter(t => t.status === 'CRITICAL').length;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors mb-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{activeTrains || '--'}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Active Trains</span>
        </div>
        
        <div className="hidden sm:block w-px h-4 bg-border"></div>
        
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success"></span>
          <span className="text-sm font-semibold text-foreground">{onTime || '--'}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">On Time</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning"></span>
          <span className="text-sm font-semibold text-foreground">{delayed || '--'}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Delayed</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
          <span className="text-sm font-semibold text-foreground">{critical || '--'}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Critical</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium bg-muted px-2.5 py-1 rounded-md text-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          LIVE
        </div>
        
        <div className="text-xs text-muted-foreground tabular-nums">
          Updated {lastUpdated}
        </div>
        
        <button 
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
          title="Refresh Network Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    </div>
  );
};
