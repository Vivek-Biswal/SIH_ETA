'use client';

import React, { useEffect, useState, use } from 'react';
import { RailwayApiService } from '@/services/api';
import { ETAResponse } from '@/types/api';
import { DataTable } from '@/components/common/DataTable';
import { KpiCard } from '@/components/common/KpiCard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function EtaAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [eta, setEta] = useState<ETAResponse | null>(null);

  useEffect(() => {
    RailwayApiService.getTrainETA(resolvedParams.id).then(setEta);
  }, [resolvedParams.id]);

  if (!eta) {
    return <div className="text-xs text-[#A1A1AA] font-mono">Loading ETA Analysis...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href={`/trains/${resolvedParams.id}`}
          className="text-xs text-[#A1A1AA] hover:text-white flex items-center gap-1 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Telemetry
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-xs text-white font-mono">
          ETA Analysis ({resolvedParams.id})
        </span>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
          ML ETA Predictive Breakdown — {eta.train_number}
          <span className="text-xs font-mono font-normal text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 border border-[#3B82F6]/30 rounded">
            {eta.model_version}
          </span>
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5 font-mono">
          PREDICTION GENERATED AT: {eta.prediction_generated_at}
        </p>
      </div>

      {/* Hero Confidence & Delay Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Overall Predicted Delay"
          value={`+${eta.overall_delay_minutes} MIN`}
          subtitle="Terminus arrival estimate"
          status={eta.overall_delay_minutes >= 15 ? 'CRITICAL' : 'WARNING'}
        />
        <KpiCard
          title="Model Confidence Score"
          value={`${(eta.confidence_score * 100).toFixed(0)}%`}
          subtitle="High feature reliability"
          status="SUCCESS"
        />
        <KpiCard
          title="Active Delay Contributors"
          value={eta.delay_factors.length}
          subtitle="Congestion & historical weights"
          status="NORMAL"
        />
      </div>

      {/* Station ETA Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Station-by-Station Arrival Projections
        </h2>
        <DataTable
          data={eta.remaining_stations}
          columns={[
            {
              header: 'Station',
              render: (s) => (
                <div>
                  <span className="font-bold text-white mr-2">{s.station.code}</span>
                  <span className="text-[#A1A1AA] text-xs">{s.station.name}</span>
                </div>
              ),
            },
            {
              header: 'Scheduled',
              accessorKey: 'scheduled_arrival',
            },
            {
              header: 'Predicted ETA',
              render: (s) => (
                <span className="text-white font-bold">{s.predicted_arrival}</span>
              ),
            },
            {
              header: 'Variance',
              align: 'right',
              render: (s) => (
                <span
                  className={
                    s.predicted_delay_minutes >= 15
                      ? 'text-[#EF4444] font-bold'
                      : 'text-[#F59E0B] font-bold'
                  }
                >
                  +{s.predicted_delay_minutes}m
                </span>
              ),
            },
            {
              header: 'Confidence',
              align: 'right',
              render: (s) => (
                <span className="text-[#A1A1AA]">
                  {(s.prediction_confidence * 100).toFixed(0)}%
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Root Causes / Contributing Delay Factors */}
      <div className="bg-[#18181B] border border-white/10 rounded-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#A1A1AA]">
          Primary Delay Contributing Factors (Attribution Engine)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eta.delay_factors.map((factor, idx) => (
            <div
              key={idx}
              className="p-4 border border-white/10 rounded bg-[#09090B] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  {factor.factor.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono text-[#EF4444] font-bold">
                  +{factor.contribution_minutes} MIN
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">{factor.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
