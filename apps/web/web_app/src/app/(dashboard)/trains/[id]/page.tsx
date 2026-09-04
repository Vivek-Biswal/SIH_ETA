'use client';

import React, { useEffect, useState, use } from 'react';
import { RailwayApiService } from '@/services/api';
import { ETAResponse, TrainStatus } from '@/types/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { KpiCard } from '@/components/common/KpiCard';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Gauge } from 'lucide-react';

export default function TrainStatusDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [train, setTrain] = useState<TrainStatus | null>(null);
  const [eta, setEta] = useState<ETAResponse | null>(null);

  useEffect(() => {
    RailwayApiService.getTrainStatus(resolvedParams.id).then(setTrain);
    RailwayApiService.getTrainETA(resolvedParams.id).then(setEta);
  }, [resolvedParams.id]);

  if (!train || !eta) {
    return <div className="text-xs text-[#A1A1AA] font-mono">Loading telemetry...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/trains"
          className="text-xs text-[#A1A1AA] hover:text-white flex items-center gap-1 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Registry
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-xs text-white font-mono">{train.train_number}</span>
      </div>

      {/* Train Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-[#18181B] border border-white/10 rounded-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {train.train_number}
            </span>
            <span className="text-lg font-semibold text-[#A1A1AA]">
              {train.train_name}
            </span>
            <StatusBadge
              type={
                train.status === 'CRITICAL'
                  ? 'CRITICAL'
                  : train.status === 'DELAYED'
                  ? 'WARNING'
                  : 'ON_TIME'
              }
              label={train.status}
              pulse
            />
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1 font-mono">
            ZONE: {train.zone} | OPERATIONAL DAY: RUNNING | SECTOR: {train.current_station.name} ({train.current_station.code})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/trains/${train.train_number}/eta`}
            className="px-3.5 py-1.5 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-semibold text-white transition-colors font-mono"
          >
            DEEP ETA PREDICTION →
          </Link>
        </div>
      </div>

      {/* Real-time Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Current Delay"
          value={`+${train.delay_minutes}m`}
          subtitle="At previous timetable stop"
          status={train.delay_minutes >= 15 ? 'CRITICAL' : 'WARNING'}
        />
        <KpiCard
          title="Speed"
          value={`${train.speed_kmh} km/h`}
          subtitle="GPS Odometer telemetry"
          status="NORMAL"
        />
        <KpiCard
          title="Next Station"
          value={train.next_station.code}
          subtitle={train.next_station.name}
          status="NORMAL"
        />
        <KpiCard
          title="Next Arrival (ETA)"
          value={train.predicted_next_arrival}
          subtitle="ML model estimate"
          status="NORMAL"
        />
      </div>

      {/* Station Timeline */}
      <div className="bg-[#18181B] border border-white/10 rounded-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Live Station Timeline & Route Progress
        </h2>

        <div className="relative border-l-2 border-white/10 ml-4 pl-6 space-y-6 my-4">
          {eta.remaining_stations.map((stop, idx) => (
            <div key={stop.station.code} className="relative">
              {/* Node indicator */}
              <div
                className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-[#18181B] ${
                  idx === 0
                    ? 'bg-[#22C55E] ring-4 ring-[#22C55E]/20'
                    : 'bg-[#A1A1AA]'
                }`}
              />

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    {stop.station.code}
                    <span className="text-xs font-normal text-[#A1A1AA]">
                      {stop.station.name}
                    </span>
                    {stop.platform && (
                      <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-[#A1A1AA]">
                        PF {stop.platform}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#A1A1AA] font-mono mt-0.5">
                    Confidence: {((stop.prediction_confidence ?? 0) * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-white">
                    {stop.predicted_arrival}
                  </div>
                  {stop.predicted_delay_minutes > 0 && (
                    <div className="text-xs font-mono text-[#EF4444]">
                      +{stop.predicted_delay_minutes}m (Sch: {stop.scheduled_arrival})
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
