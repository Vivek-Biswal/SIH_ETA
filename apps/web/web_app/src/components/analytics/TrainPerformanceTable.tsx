'use client';

import React, { useState } from 'react';
import { TrainStatus } from '@/types/api';
import Link from 'next/link';
import { ExternalLink, ArrowUpDown } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';

interface TrainPerformanceTableProps {
  trains: TrainStatus[];
  isLoading: boolean;
}

type SortField = 'train_number' | 'delay_minutes' | 'status';
type SortOrder = 'asc' | 'desc';

export const TrainPerformanceTable: React.FC<TrainPerformanceTableProps> = ({ trains, isLoading }) => {
  const [sortField, setSortField] = useState<SortField>('delay_minutes');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'train_number' ? 'asc' : 'desc');
    }
  };

  const sortedTrains = [...trains].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'train_number') {
      comparison = a.train_number.localeCompare(b.train_number);
    } else if (sortField === 'delay_minutes') {
      comparison = a.delay_minutes - b.delay_minutes;
    } else if (sortField === 'status') {
      const getScore = (s: string) => s === 'CRITICAL' ? 3 : s === 'WARNING' ? 2 : 1;
      comparison = getScore(a.status) - getScore(b.status);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/30 ml-1" />;
    return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortOrder === 'desc' ? 'text-foreground' : 'text-foreground transform rotate-180'}`} />;
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Train Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Current delay impact by service</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">
                <button onClick={() => handleSort('train_number')} className="flex items-center hover:text-foreground">
                  Train {getSortIcon('train_number')}
                </button>
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Route</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">
                <button onClick={() => handleSort('delay_minutes')} className="flex items-center justify-end w-full hover:text-foreground">
                  Current Delay {getSortIcon('delay_minutes')}
                </button>
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">
                <button onClick={() => handleSort('status')} className="flex items-center justify-end w-full hover:text-foreground">
                  Status {getSortIcon('status')}
                </button>
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Loading state
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-24" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-32" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-12 ml-auto" /></td>
                  <td className="px-5 py-4"><div className="h-6 bg-muted rounded w-20 ml-auto" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-4 ml-auto" /></td>
                </tr>
              ))
            ) : sortedTrains.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No trains found in current snapshot.
                </td>
              </tr>
            ) : (
              // Data rows
              sortedTrains.slice(0, 10).map((train) => (
                <tr key={train.train_number} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground font-mono">{train.train_number}</span>
                      <span className="text-xs text-muted-foreground">{train.train_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {train.current_station && train.next_station ? (
                      <span className="text-xs text-muted-foreground font-mono">
                        {train.current_station.code} → {train.next_station.code}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-bold tabular-nums ${
                      train.delay_minutes > 15 ? 'text-destructive' : 
                      train.delay_minutes > 0 ? 'text-warning' : 
                      'text-success'
                    }`}>
                      {train.delay_minutes > 0 ? `+${train.delay_minutes}m` : 'On Time'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end">
                      <StatusBadge 
                        type={train.status === 'DELAYED' ? 'WARNING' : train.status} 
                        label={train.status === 'DELAYED' ? 'Delayed' : undefined}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link 
                      href={`/trains/${train.train_number}`}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      title="View Train Intelligence"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!isLoading && sortedTrains.length > 10 && (
          <div className="px-5 py-3 bg-muted/10 border-t border-border text-center">
            <span className="text-xs text-muted-foreground">Showing top 10 worst performing trains in snapshot</span>
          </div>
        )}
      </div>
    </div>
  );
};
