'use client';

import dynamic from 'next/dynamic';
import { TrainStatus } from '@/types/api';

const NetworkMap = dynamic(
  () => import('./NetworkMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-border animate-pulse">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-muted-foreground">Initializing map engine...</p>
      </div>
    )
  }
);

interface MapWrapperProps {
  trains: TrainStatus[];
  onSelectTrain: (train: TrainStatus | null) => void;
  selectedTrainId: string | null;
}

export const MapWrapper: React.FC<MapWrapperProps> = (props) => {
  return <NetworkMap {...props} />;
};
