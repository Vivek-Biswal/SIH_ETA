'use client';

import React from 'react';
import { TrainStatus } from '@/types/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

interface AffectedTrainsProps {
  trains: TrainStatus[];
  isLoading: boolean;
}

export const AffectedTrains: React.FC<AffectedTrainsProps> = ({ trains, isLoading }) => {
  const affected = trains.filter((t) => t.delay_minutes > 0 || t.status === 'CRITICAL');

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm animate-pulse">
        <div className="p-5 border-b border-border">
          <div className="h-5 bg-muted rounded w-36" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 flex gap-3 items-center">
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors h-full flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Affected Trains</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {affected.length} train{affected.length !== 1 ? 's' : ''} currently delayed or disrupted
          </p>
        </div>
        <Link
          href="/trains"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          View All <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {affected.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-sm font-medium text-foreground mb-1">No affected trains</div>
            <p className="text-xs text-muted-foreground">All monitored trains are currently on time.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {affected.slice(0, 10).map((train, i) => {
              const isCritical = train.status === 'CRITICAL';
              const delayColor = isCritical ? 'text-destructive' : 'text-warning';

              return (
                <Link
                  key={i}
                  href={`/trains/${train.train_number}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-foreground font-mono">{train.train_number}</span>
                      <span className="text-xs text-muted-foreground truncate">{train.train_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {train.current_station?.code} <ArrowRight className="w-3 h-3 inline" /> {train.next_station?.code}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${delayColor}`}>
                      +{train.delay_minutes} min
                    </span>
                    <StatusBadge
                      type={isCritical ? 'CRITICAL' : 'WARNING'}
                    />
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              );
            })}

            {affected.length > 10 && (
              <div className="px-5 py-3 text-xs text-muted-foreground text-center">
                +{affected.length - 10} more affected trains
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
