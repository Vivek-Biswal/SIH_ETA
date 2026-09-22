'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

export const DelayTrendChart: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col">
      <div className="p-5 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Delay Trend</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Average network delay over time</p>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <BarChart3 className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium text-foreground mb-1">Not enough data</div>
        <p className="text-xs text-muted-foreground max-w-[250px]">
          Historical delay data is required to display this trend. Currently showing live snapshots only.
        </p>
      </div>
    </div>
  );
};
