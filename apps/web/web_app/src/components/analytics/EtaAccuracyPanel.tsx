'use client';

import React from 'react';
import { Target, AlertCircle } from 'lucide-react';

export const EtaAccuracyPanel: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">ETA Prediction Accuracy</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Historical verification of prediction models</p>
        </div>
        <span className="bg-muted text-muted-foreground text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
          Pending
        </span>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 relative">
          <Target className="w-6 h-6 text-muted-foreground" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-card rounded-full flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
        </div>
        
        <div className="text-sm font-medium text-foreground mb-2">Evaluation data unavailable</div>
        
        <div className="bg-muted/30 p-4 rounded-lg text-xs text-muted-foreground text-left max-w-sm">
          <p className="mb-2">
            ETA accuracy evaluation requires comparing past predictions against <span className="font-semibold text-foreground">verified actual arrival data</span>.
          </p>
          <p>
            The current dataset only contains timetable schedules and aggregated delay snapshots. Continuous historical monitoring is required to establish MAE, RMSE, and bias metrics.
          </p>
        </div>
      </div>
    </div>
  );
};
