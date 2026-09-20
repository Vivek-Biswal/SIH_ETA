import React from 'react';

interface Station {
  code: string;
  name?: string;
}

interface RouteProgressProps {
  stations: Station[];
  currentStationIndex: number;
}

export const RouteProgress: React.FC<RouteProgressProps> = ({ stations, currentStationIndex }) => {
  if (stations.length < 2) return null;

  return (
    <div className="w-full flex items-center justify-between relative mt-4 mb-2">
      {/* Background Line */}
      <div className="absolute left-0 right-0 h-1 bg-[var(--color-border-subtle)] top-1/2 -translate-y-1/2 rounded-full" />
      
      {/* Progress Line */}
      <div 
        className="absolute left-0 h-1 bg-[var(--color-brand-blue)] top-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out" 
        style={{ width: `${(currentStationIndex / (stations.length - 1)) * 100}%` }}
      />
      
      {/* Station Dots */}
      {stations.map((station, idx) => {
        const isPast = idx <= currentStationIndex;
        const isCurrent = idx === currentStationIndex;
        
        return (
          <div key={idx} className="relative z-10 flex flex-col items-center">
            {/* Dot */}
            <div 
              className={`w-3 h-3 rounded-full border-2 transition-colors duration-300 ${
                isCurrent
                  ? 'bg-white border-[var(--color-brand-blue)] ring-4 ring-blue-100'
                  : isPast
                  ? 'bg-[var(--color-brand-blue)] border-[var(--color-brand-blue)]'
                  : 'bg-white border-[var(--color-border-subtle)]'
              }`}
            />
            {/* Label */}
            <span className={`absolute top-5 text-[10px] font-bold ${isCurrent ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
              {station.code}
            </span>
          </div>
        );
      })}
    </div>
  );
};
