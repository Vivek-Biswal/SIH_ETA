'use client';

import React, { useEffect, useState } from 'react';
import { RailwayApiService } from '@/services/api';
import { TrainStatus } from '@/types/api';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function TrainSearchPage() {
  const [query, setQuery] = useState('');
  const [trains, setTrains] = useState<TrainStatus[]>([]);

  useEffect(() => {
    RailwayApiService.searchTrains(query).then(setTrains);
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Train Registry & Status Search
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Locate active services across all operational zones
        </p>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-3 bg-[#18181B] p-3 border border-white/10 rounded-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Filter by train number, name or zone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#09090B] border border-white/10 rounded px-3 py-1.5 pl-9 text-xs text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
          <span className="font-mono text-[11px] bg-white/5 px-2 py-1 border border-white/10 rounded">
            TOTAL: {trains.length}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={trains}
        columns={[
          {
            header: 'Number',
            accessorKey: 'train_number',
            render: (t) => (
              <span className="font-bold text-white tracking-wider">
                {t.train_number}
              </span>
            ),
          },
          {
            header: 'Service Name',
            accessorKey: 'train_name',
            render: (t) => (
              <Link
                href={`/trains/${t.train_number}`}
                className="text-white hover:text-[#3B82F6] transition-colors"
              >
                {t.train_name}
              </Link>
            ),
          },
          {
            header: 'Zone',
            accessorKey: 'zone',
            render: (t) => (
              <span className="text-[#A1A1AA] font-mono">{t.zone}</span>
            ),
          },
          {
            header: 'Sector',
            render: (t) => (
              <span className="text-xs">
                {t.current_station.code} → {t.next_station.code}
              </span>
            ),
          },
          {
            header: 'Speed',
            align: 'right',
            render: (t) => (
              <span className="text-white font-mono">{t.speed_kmh} km/h</span>
            ),
          },
          {
            header: 'Delay',
            align: 'right',
            render: (t) => (
              <span
                className={
                  t.delay_minutes >= 15
                    ? 'text-[#EF4444] font-bold'
                    : t.delay_minutes > 0
                    ? 'text-[#F59E0B] font-bold'
                    : 'text-[#22C55E]'
                }
              >
                {t.delay_minutes > 0 ? `+${t.delay_minutes}m` : '0m'}
              </span>
            ),
          },
          {
            header: 'Status',
            align: 'right',
            render: (t) => (
              <StatusBadge
                type={
                  t.status === 'CRITICAL'
                    ? 'CRITICAL'
                    : t.status === 'DELAYED'
                    ? 'WARNING'
                    : 'ON_TIME'
                }
                label={t.status}
              />
            ),
          },
          {
            header: 'Action',
            align: 'right',
            render: (t) => (
              <Link
                href={`/trains/${t.train_number}/eta`}
                className="text-[11px] text-[#3B82F6] hover:underline font-mono"
              >
                ETA Analysis →
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
