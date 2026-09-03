'use client';

import React, { useEffect, useState } from 'react';
import { RailwayApiService } from '@/services/api';
import { RouteCongestionSegment } from '@/types/api';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { KpiCard } from '@/components/common/KpiCard';

export default function RouteCongestionPage() {
  const [segments, setSegments] = useState<RouteCongestionSegment[]>([]);

  useEffect(() => {
    RailwayApiService.getRouteCongestion().then(setSegments);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Route Corridor Congestion Analysis
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Track-block occupancy metrics and precedence congestion scores [DEMO]
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Average Corridor Density"
          value="68 [DEMO]"
          subtitle="System capacity threshold"
          status="WARNING"
        />
        <KpiCard
          title="Most Congested Block"
          value="NDLS–GZB"
          subtitle="Score: 88 (Critical)"
          status="CRITICAL"
        />
        <KpiCard
          title="Active Trains in Corridor"
          value="29 TRAINS"
          subtitle="Simultaneous occupation"
          status="NORMAL"
        />
      </div>

      {/* Segment Congestion Bars and Data Table */}
      <div className="bg-[#18181B] border border-white/10 rounded-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
          High Density Corridor Segments
        </h2>

        <DataTable
          data={segments}
          columns={[
            {
              header: 'Segment Identifier',
              accessorKey: 'segment_id',
              render: (s) => (
                <span className="font-bold text-white font-mono">
                  {s.segment_id}
                </span>
              ),
            },
            {
              header: 'Span (Origin → Terminus)',
              render: (s) => (
                <span>
                  {s.from_station} → {s.to_station}
                </span>
              ),
            },
            {
              header: 'Active Trains',
              accessorKey: 'active_trains',
              align: 'right',
            },
            {
              header: 'Congestion Score [DEMO]',
              align: 'right',
              render: (s) => (
                <div className="flex items-center justify-end gap-2">
                  <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        s.congestion_score >= 80
                          ? 'bg-[#EF4444]'
                          : s.congestion_score >= 50
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#22C55E]'
                      }`}
                      style={{ width: `${s.congestion_score}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-white">
                    {s.congestion_score}
                  </span>
                </div>
              ),
            },
            {
              header: 'Status',
              align: 'right',
              render: (s) => (
                <StatusBadge
                  type={
                    s.status === 'CONFLICT'
                      ? 'CRITICAL'
                      : s.status === 'CONGESTED'
                      ? 'WARNING'
                      : 'ON_TIME'
                  }
                  label={s.status}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
