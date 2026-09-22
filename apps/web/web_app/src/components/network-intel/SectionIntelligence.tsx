'use client';

import React from 'react';
import { NetworkZoneStatus, RouteCongestionSegment } from '@/types/api';
import { StatusBadge } from '@/components/common/StatusBadge';

interface SectionIntelligenceProps {
  zones: NetworkZoneStatus[];
  segments: RouteCongestionSegment[];
  isLoading: boolean;
  filterStatus: string;
  onFilterChange: (f: string) => void;
}

export const SectionIntelligence: React.FC<SectionIntelligenceProps> = ({
  zones,
  segments,
  isLoading,
  filterStatus,
  onFilterChange,
}) => {
  // Merge zone data with segment data into a unified section list
  const sections = zones.map((z) => ({
    id: z.zone_code,
    name: z.zone_name,
    activeTrains: z.active_trains,
    delayedTrains: z.delayed_trains,
    criticalConflicts: z.critical_conflicts,
    avgDelay: z.avg_delay_minutes,
    status: z.status === 'DISRUPTED' ? 'CONFLICT' : z.status === 'CONGESTED' ? 'CONGESTED' : 'NORMAL',
  }));

  // Also add route segments if they exist
  const segmentRows = segments.map((s) => ({
    id: s.segment_id,
    name: `${s.from_station} → ${s.to_station}`,
    activeTrains: s.active_trains,
    delayedTrains: 0,
    criticalConflicts: s.status === 'CONFLICT' ? 1 : 0,
    avgDelay: 0,
    status: s.status,
    congestionScore: s.congestion_score,
  }));

  const allSections = [...sections, ...segmentRows];

  const filtered = filterStatus === 'ALL'
    ? allSections
    : filterStatus === 'CRITICAL'
    ? allSections.filter(s => s.status === 'CONFLICT')
    : filterStatus === 'DELAYED'
    ? allSections.filter(s => s.status === 'CONGESTED')
    : allSections.filter(s => s.status === 'NORMAL');

  const filters = ['ALL', 'CRITICAL', 'DELAYED', 'NORMAL'];

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-5 border-b border-border">
          <div className="h-5 bg-muted rounded w-40 animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 flex gap-4 animate-pulse">
              <div className="h-4 bg-muted rounded flex-1" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors">
      <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Section Intelligence</h2>

        {/* Filter Tabs */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterStatus === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'ALL' ? 'All Sections' : f === 'CONFLICT' ? 'Critical' : f === 'CONGESTED' ? 'Delayed' : 'Normal'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-sm font-medium text-foreground mb-1">No active network issues</div>
          <p className="text-xs text-muted-foreground">
            {filterStatus === 'ALL'
              ? 'The monitored network has no significant operational disruptions.'
              : 'No sections match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="w-full text-sm hidden sm:table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Section</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trains</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delayed</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Delay</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((section, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-foreground">{section.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{section.id}</div>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums font-medium text-foreground">
                    {section.activeTrains}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    <span className={section.delayedTrains > 0 ? 'text-warning font-semibold' : 'text-muted-foreground'}>
                      {section.delayedTrains}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {section.avgDelay > 0 ? (
                      <span className="text-warning font-semibold">+{section.avgDelay} min</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <StatusBadge
                      type={section.status === 'CONFLICT' ? 'CRITICAL' : section.status === 'CONGESTED' ? 'WARNING' : 'ON_TIME'}
                      label={section.status === 'CONFLICT' ? 'Critical' : section.status === 'CONGESTED' ? 'Congested' : 'Normal'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-border">
            {filtered.map((section, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-foreground text-sm">{section.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{section.id}</div>
                  </div>
                  <StatusBadge
                    type={section.status === 'CONFLICT' ? 'CRITICAL' : section.status === 'CONGESTED' ? 'WARNING' : 'ON_TIME'}
                    label={section.status === 'CONFLICT' ? 'Critical' : section.status === 'CONGESTED' ? 'Congested' : 'Normal'}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{section.activeTrains} trains</span>
                  {section.delayedTrains > 0 && <span className="text-warning">{section.delayedTrains} delayed</span>}
                  {section.avgDelay > 0 && <span className="text-warning">+{section.avgDelay}m avg</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
