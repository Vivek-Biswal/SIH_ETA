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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Check Train ETA
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Search for live train status and expected arrival times
        </p>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-3 bg-[var(--color-surface-card)] p-4 border border-[var(--color-border-subtle)] rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by train number or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[var(--color-canvas-bg)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-2.5 pl-10 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent transition-shadow"
          />
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <span className="font-medium bg-[var(--color-surface-hover)] px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)]">
            {trains.length} Trains Found
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm pt-2">
        <DataTable
          data={trains}
          columns={[
            {
              header: 'Number',
              accessorKey: 'train_number',
              render: (t) => (
                <span className="font-bold text-[var(--color-text-primary)] tracking-wide">
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
                  className="text-[var(--color-text-primary)] hover:text-[var(--color-brand-blue)] transition-colors font-medium"
                >
                  {t.train_name}
                </Link>
              ),
            },
            {
              header: 'Zone',
              accessorKey: 'zone',
              render: (t) => (
                <span className="text-[var(--color-text-muted)] text-sm">{t.zone}</span>
              ),
            },
            {
              header: 'Sector',
              render: (t) => (
                <span className="text-sm text-[var(--color-text-muted)]">
                  {t.current_station.code} → {t.next_station.code}
                </span>
              ),
            },
            {
              header: 'Speed',
              align: 'right',
              render: (t) => (
                <span className="text-[var(--color-text-primary)] font-medium">{t.speed_kmh} km/h</span>
              ),
            },
            {
              header: 'Delay',
              align: 'right',
              render: (t) => (
                <span
                  className={`font-semibold ${
                    t.delay_minutes >= 15
                      ? 'text-[var(--color-critical-red)]'
                      : t.delay_minutes > 0
                      ? 'text-[var(--color-warning-amber)]'
                      : 'text-[var(--color-live-green)]'
                  }`}
                >
                  {t.delay_minutes > 0 ? `+${t.delay_minutes} min` : 'On Time'}
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
                      : t.status === 'DELAYED' || t.delay_minutes > 0
                      ? 'WARNING'
                      : 'ON_TIME'
                  }
                />
              ),
            },
            {
              header: 'Action',
              align: 'right',
              render: (t) => (
                <Link
                  href={`/trains/${t.train_number}`}
                  className="text-sm font-semibold text-[var(--color-brand-blue)] hover:underline"
                >
                  Get ETA
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
