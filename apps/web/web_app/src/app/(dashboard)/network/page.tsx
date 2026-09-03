'use client';

import React, { useEffect, useState } from 'react';
import { RailwayApiService } from '@/services/api';
import { NetworkZoneStatus } from '@/types/api';
import { KpiCard } from '@/components/common/KpiCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable } from '@/components/common/DataTable';

export default function NetworkOverviewPage() {
  const [zones, setZones] = useState<NetworkZoneStatus[]>([]);

  useEffect(() => {
    RailwayApiService.getNetworkStatus().then(setZones);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Network Operations & Zone Health
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Zonal density, average delay tolerances, and section throughput
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Monitored Railway Zones"
          value="18 ZONES"
          subtitle="All divisions reporting"
          status="NORMAL"
        />
        <KpiCard
          title="Congested Corridors"
          value="4 SECTORS"
          subtitle="Bottlenecks detected"
          status="WARNING"
        />
        <KpiCard
          title="Active Conflicts"
          value="6 BLOCKS"
          subtitle="Precedence arbitration required"
          status="CRITICAL"
        />
        <KpiCard
          title="On-Time Departure Index"
          value="82.4%"
          subtitle="System aggregate"
          status="SUCCESS"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Railway Zone Telemetry Matrix
        </h2>
        <DataTable
          data={zones}
          columns={[
            {
              header: 'Zone Code',
              accessorKey: 'zone_code',
              render: (z) => (
                <span className="font-bold text-white tracking-wide font-mono">
                  {z.zone_code}
                </span>
              ),
            },
            {
              header: 'Zone Name',
              accessorKey: 'zone_name',
            },
            {
              header: 'Active Trains',
              accessorKey: 'active_trains',
              align: 'right',
            },
            {
              header: 'Delayed',
              accessorKey: 'delayed_trains',
              align: 'right',
              render: (z) => (
                <span className={z.delayed_trains > 50 ? 'text-[#EF4444]' : 'text-white'}>
                  {z.delayed_trains}
                </span>
              ),
            },
            {
              header: 'Conflicts',
              accessorKey: 'critical_conflicts',
              align: 'right',
              render: (z) => (
                <span className={z.critical_conflicts > 0 ? 'text-[#EF4444] font-bold' : 'text-[#22C55E]'}>
                  {z.critical_conflicts}
                </span>
              ),
            },
            {
              header: 'Average Delay',
              align: 'right',
              render: (z) => (
                <span className="font-bold text-[#F59E0B] font-mono">
                  {z.avg_delay_minutes} MIN
                </span>
              ),
            },
            {
              header: 'Status',
              align: 'right',
              render: (z) => (
                <StatusBadge
                  type={
                    z.status === 'DISRUPTED'
                      ? 'CRITICAL'
                      : z.status === 'CONGESTED'
                      ? 'WARNING'
                      : 'ON_TIME'
                  }
                  label={z.status}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
