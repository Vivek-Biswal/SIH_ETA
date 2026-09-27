'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SimTrain, SimSegment } from '@/types/simulation';

const SimulationMap = dynamic(
  () => import('./SimulationMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-border animate-pulse">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Loading simulation map...</p>
      </div>
    ),
  }
);

interface SimMapWrapperProps {
  trains:     SimTrain[];
  segments:   SimSegment[];
  selectedId: string | null;
  onSelect:   (id: string | null) => void;
}

export const SimMapWrapper: React.FC<SimMapWrapperProps> = (props) => (
  <SimulationMap {...props} />
);
