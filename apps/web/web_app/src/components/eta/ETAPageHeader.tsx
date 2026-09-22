'use client';

import React from 'react';
import { TrainStatus } from '@/types/api';
import { DataFreshness } from '@/components/common/DataFreshness';

interface ETAPageHeaderProps {
  selectedTrain: TrainStatus | null;
  updatedAt: string;
  dataFreshness: 'live' | 'stale' | 'unavailable';
}

export const ETAPageHeader: React.FC<ETAPageHeaderProps> = ({ selectedTrain, updatedAt, dataFreshness }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 flex-shrink-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">ETA Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered train arrival prediction and journey intelligence
        </p>
      </div>

      <div className="flex items-center gap-2 self-start">
        <DataFreshness status={dataFreshness} />
      </div>
    </div>
  );
};
