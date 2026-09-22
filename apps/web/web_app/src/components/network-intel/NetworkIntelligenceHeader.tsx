'use client';

import React from 'react';
import { DataFreshness } from '@/components/common/DataFreshness';

type DataFreshnessType = 'live' | 'stale' | 'unavailable';

interface NetworkIntelligenceHeaderProps {
  updatedAt: string;
  dataFreshness: DataFreshnessType;
}

export const NetworkIntelligenceHeader: React.FC<NetworkIntelligenceHeaderProps> = ({
  updatedAt,
  dataFreshness,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Network Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Understand congestion, bottlenecks and delay propagation across the railway network
        </p>
      </div>

      <div className="flex items-center gap-2 self-start">
        <DataFreshness status={dataFreshness} />
      </div>
    </div>
  );
};
