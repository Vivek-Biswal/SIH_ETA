'use client';

import React from 'react';
import { KpiCard } from '@/components/common/KpiCard';
import { DataTable } from '@/components/common/DataTable';

export default function DelayAnalyticsPage() {
  const topDelayedTrains = [
    { number: '12301', name: 'Howrah Rajdhani', avgDelay: '38m', runs: 28, worstDay: 'Thursday' },
    { number: '12802', name: 'Purushottam Express', avgDelay: '46m', runs: 30, worstDay: 'Tuesday' },
    { number: '22221', name: 'CSMT Rajdhani', avgDelay: '22m', runs: 26, worstDay: 'Friday' },
    { number: '12398', name: 'Mahabodhi Express', avgDelay: '54m', runs: 30, worstDay: 'Monday' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Historical Delay Analytics & Performance Trends
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Aggregate performance analysis over rolling 30-day operational windows [DEMO]
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Average System Delay"
          value="23 MIN [DEMO]"
          subtitle="All passenger classifications"
          status="WARNING"
        />
        <KpiCard
          title="Punctuality Index (On-Time)"
          value="68.4% [DEMO]"
          subtitle="Within 15-minute threshold"
          status="WARNING"
        />
        <KpiCard
          title="Worst Affected Sector"
          value="NR (NDLS–CNB)"
          subtitle="Avg delay: 42m"
          status="CRITICAL"
        />
      </div>

      <div className="bg-[#18181B] border border-white/10 rounded-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Top Recurring Delay Services (30-Day Window)
        </h2>
        <DataTable
          data={topDelayedTrains}
          columns={[
            {
              header: 'Train Number',
              accessorKey: 'number',
              render: (t) => <span className="font-bold text-white font-mono">{t.number}</span>,
            },
            {
              header: 'Service Name',
              accessorKey: 'name',
            },
            {
              header: 'Average Delay',
              accessorKey: 'avgDelay',
              align: 'right',
              render: (t) => <span className="font-bold text-[#EF4444] font-mono">{t.avgDelay}</span>,
            },
            {
              header: 'Monitored Runs',
              accessorKey: 'runs',
              align: 'right',
            },
            {
              header: 'Worst Operational Day',
              accessorKey: 'worstDay',
              align: 'right',
              render: (t) => <span className="text-[#F59E0B] font-mono">{t.worstDay}</span>,
            },
          ]}
        />
      </div>
    </div>
  );
}
