'use client';

import React, { useEffect, useState } from 'react';
import { RailwayApiService } from '@/services/api';
import { TrainStatus, NetworkZoneStatus } from '@/types/api';
import { KpiCard } from '@/components/common/KpiCard';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function DashboardPage() {
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [zones, setZones] = useState<NetworkZoneStatus[]>([]);

  useEffect(() => {
    RailwayApiService.searchTrains().then(setTrains);
    RailwayApiService.getNetworkStatus().then(setZones);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Operational Overview
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Real-time train positioning, active delays, and network congestion alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/network/map"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-medium text-white transition-colors"
          >
            Live Network Map
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Active Trains"
          value="847"
          subtitle="+14 from last hour"
          status="NORMAL"
          tag="REALTIME"
        />
        <KpiCard
          title="Delayed Trains"
          value="246"
          subtitle="29% of active volume"
          status="WARNING"
          tag="> 5 MIN"
        />
        <KpiCard
          title="Critical Disruptions"
          value="12"
          subtitle="Block conflicts detected"
          status="CRITICAL"
          tag="> 30 MIN"
        />
        <KpiCard
          title="Average Network Delay"
          value="18m"
          subtitle="Target threshold: 12m"
          status="WARNING"
          tag="SYSTEM-WIDE"
        />
      </div>

      {/* Main Grid: Priority Trains + Zone Congestion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Monitored Trains (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
              Priority Monitored Services
            </h2>
            <Link
              href="/trains"
              className="text-xs text-[#3B82F6] hover:underline font-mono"
            >
              View All Trains →
            </Link>
          </div>

          <DataTable
            data={trains}
            columns={[
              {
                header: 'Train',
                render: (t) => (
                  <Link
                    href={`/trains/${t.train_number}`}
                    className="hover:underline flex flex-col"
                  >
                    <span className="text-white font-bold">{t.train_number}</span>
                    <span className="text-[11px] text-[#A1A1AA]">{t.train_name}</span>
                  </Link>
                ),
              },
              {
                header: 'Current Sector',
                render: (t) => (
                  <div className="text-xs">
                    <span className="text-white">{t.current_station.code}</span>
                    <span className="text-[#A1A1AA]"> → {t.next_station.code}</span>
                  </div>
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
            ]}
          />
        </div>

        {/* Zone Status Panel (1 col) */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
            Zonal Congestion Breakdown
          </h2>

          <div className="border border-white/10 rounded-sm bg-[#18181B] divide-y divide-white/10">
            {zones.map((z) => (
              <div
                key={z.zone_code}
                className="p-3.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    {z.zone_code}
                    <span className="text-[10px] text-[#A1A1AA] font-normal">
                      ({z.zone_name})
                    </span>
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] font-mono mt-0.5">
                    Active: {z.active_trains} | Delayed: {z.delayed_trains}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
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
                  <span className="text-[10px] font-mono text-[#A1A1AA]">
                    Avg: {z.avg_delay_minutes}m
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
