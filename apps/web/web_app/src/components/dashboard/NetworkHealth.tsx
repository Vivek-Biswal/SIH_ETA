'use client';

import React from 'react';
import { Activity } from 'lucide-react';

export const NetworkHealth: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm transition-colors flex flex-col h-full min-h-[400px]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center relative">
          <span className="w-3 h-3 rounded-full bg-success absolute"></span>
          <span className="w-3 h-3 rounded-full bg-success animate-ping absolute opacity-75"></span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">Network Health</h2>
          <div className="text-xl font-bold text-foreground">Operational</div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-8">
        {/* Donut Chart / Progress Distribution Placeholder */}
        <div className="flex items-center justify-center relative py-4">
          <div className="w-40 h-40 rounded-full border-[12px] border-muted relative flex items-center justify-center">
            {/* Fake SVG donut overlay for visual effect */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 overflow-visible">
              <circle cx="50%" cy="50%" r="42%" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="100 100" className="text-success opacity-80" />
            </svg>
            <Activity className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 w-full px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
              <span className="text-sm text-muted-foreground font-medium">On Time / Normal</span>
            </div>
            <span className="font-bold text-foreground tabular-nums">74%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-warning"></span>
              <span className="text-sm text-muted-foreground font-medium">Minor Delay</span>
            </div>
            <span className="font-bold text-foreground tabular-nums">21%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive"></span>
              <span className="text-sm text-muted-foreground font-medium">Critical</span>
            </div>
            <span className="font-bold text-foreground tabular-nums">5%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
