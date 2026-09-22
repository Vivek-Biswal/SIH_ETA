'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { DataFreshness } from '@/components/common/DataFreshness';

export const DashboardHeader: React.FC = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Client-side only rendering for time to avoid hydration mismatch
    const updateTime = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Railway Operations Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of train movement, ETA predictions and network health
        </p>
      </div>
      
      <div className="flex items-center gap-2 self-start">
        <DataFreshness />
      </div>
    </div>
  );
};
