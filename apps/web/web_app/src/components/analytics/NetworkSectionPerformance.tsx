'use client';

import React from 'react';
import { NetworkZoneStatus } from '@/types/api';
import { StatusBadge } from '@/components/common/StatusBadge';

interface NetworkSectionPerformanceProps {
  zones: NetworkZoneStatus[];
  isLoading: boolean;
}

export const NetworkSectionPerformance: React.FC<NetworkSectionPerformanceProps> = ({ zones, isLoading }) => {
  // Sort zones by status severity
  const sortedZones = [...zones].sort((a, b) => {
    const getScore = (s: string) => s === 'DISRUPTED' ? 3 : s === 'CONGESTED' ? 2 : 1;
    return getScore(b.status) - getScore(a.status);
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Section Performance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Current network zone health snapshot</p>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Zone</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Affected Trains</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Avg Delay</th>
              <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-16" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-12 ml-auto" /></td>
                  <td className="px-5 py-4"><div className="h-4 bg-muted rounded w-12 ml-auto" /></td>
                  <td className="px-5 py-4"><div className="h-6 bg-muted rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : sortedZones.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No zone data available.
                </td>
              </tr>
            ) : (
              sortedZones.slice(0, 10).map((zone) => (
                <tr key={zone.zone_code} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-sm text-foreground font-mono">{zone.zone_code}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm tabular-nums font-medium ${zone.delayed_trains > 0 ? 'text-warning' : 'text-success'}`}>
                      {zone.delayed_trains}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm tabular-nums font-bold ${
                      zone.avg_delay_minutes > 15 ? 'text-destructive' : 
                      zone.avg_delay_minutes > 0 ? 'text-warning' : 
                      'text-success'
                    }`}>
                      {zone.avg_delay_minutes > 0 ? `+${zone.avg_delay_minutes}m` : '0m'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end">
                      <StatusBadge 
                        type={zone.status === 'DISRUPTED' ? 'CRITICAL' : zone.status === 'CONGESTED' ? 'WARNING' : 'ON_TIME'} 
                        label={zone.status === 'HEALTHY' ? 'Normal' : undefined}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
