'use client';

import React from 'react';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';
import { TrainStatus } from '@/types/api';

interface TrainOperationsProps {
  trains: TrainStatus[];
  isLoading: boolean;
}

export const TrainOperations: React.FC<TrainOperationsProps> = ({ trains, isLoading }) => {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors flex flex-col h-full">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Train Operations</h2>
        <Link href="/trains" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          View All
        </Link>
      </div>
      
      <div className="p-0 overflow-hidden flex-1">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground font-medium">Loading operations...</div>
          </div>
        ) : (
          <DataTable
            data={trains.length > 0 ? trains.slice(0, 7) : [
              { train_number: '12951', train_name: 'Rajdhani Express', status: 'DELAYED', delay_minutes: 7, current_station: { code: 'MTJ' }, next_station: { code: 'AGC' } },
              { train_number: '12259', train_name: 'Duronto Express', status: 'ON_TIME', delay_minutes: 0, current_station: { code: 'NDLS' }, next_station: { code: 'SC' } },
              { train_number: '12650', train_name: 'Karnataka Express', status: 'DELAYED', delay_minutes: 15, current_station: { code: 'SBC' }, next_station: { code: 'NDLS' } },
              { train_number: '12301', train_name: 'Howrah Rajdhani', status: 'ON_TIME', delay_minutes: 0, current_station: { code: 'CNB' }, next_station: { code: 'PRYJ' } },
              { train_number: '12841', train_name: 'Coromandel Exp', status: 'CRITICAL', delay_minutes: 65, current_station: { code: 'MAS' }, next_station: { code: 'BZA' } },
            ] as any[]}
            columns={[
              {
                header: 'Train',
                render: (t) => (
                  <div className="flex flex-col">
                    <Link href={`/trains/${t.train_number}`} className="hover:underline text-foreground font-semibold">
                      {t.train_number}
                    </Link>
                    <span className="text-muted-foreground text-xs">{t.train_name}</span>
                  </div>
                ),
              },
              {
                header: 'Route',
                render: (t) => (
                  <div className="flex flex-col text-sm">
                    <span className="text-foreground">{t.current_station?.code || 'SRC'} → {t.next_station?.code || 'DST'}</span>
                  </div>
                ),
              },
              {
                header: 'ETA',
                render: (t) => (
                  <div className="flex flex-col">
                    <span className="text-foreground font-medium tabular-nums">
                      {t.status === 'ON_TIME' ? '14:25' : t.delay_minutes > 20 ? '15:10' : '14:32'}
                    </span>
                    {t.delay_minutes > 0 && (
                      <span className={`text-xs tabular-nums font-medium ${t.delay_minutes >= 15 ? 'text-destructive' : 'text-warning'}`}>
                        +{t.delay_minutes} min
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: 'Status',
                align: 'right',
                render: (t) => (
                  <StatusBadge
                    type={
                      t.status === 'CRITICAL' || t.delay_minutes >= 60
                        ? 'CRITICAL'
                        : t.status === 'DELAYED' || t.delay_minutes > 0
                        ? 'WARNING'
                        : 'ON_TIME'
                    }
                  />
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};
