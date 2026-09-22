'use client';

import React from 'react';
import { DataFreshness } from '@/components/common/DataFreshness';

interface AnalyticsHeaderProps {
  timeRange: string;
  setTimeRange: (range: string) => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ timeRange, setTimeRange }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
          <DataFreshness />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Railway performance, delay trends and ETA prediction accuracy
        </p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="Current Snapshot">Current Snapshot</option>
          <option value="Today" disabled>Today (Unavailable)</option>
          <option value="Last 7 Days" disabled>Last 7 Days (Unavailable)</option>
          <option value="Last 30 Days" disabled>Last 30 Days (Unavailable)</option>
        </select>
        <button
          disabled
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
          title="Export not yet implemented"
        >
          Export
        </button>
      </div>
    </div>
  );
};
