'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

export default function StationsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Stations
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Manage and view railway stations across operational zones
        </p>
      </div>

      <div className="flex flex-col items-center justify-center bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-xl py-24 shadow-sm text-center">
        <div className="bg-[var(--color-surface-hover)] p-4 rounded-full mb-4">
          <MapPin className="w-8 h-8 text-[var(--color-brand-blue)]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Station Directory Coming Soon</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md">
          This module will provide detailed telemetry, platform utilization, and congestion metrics for all major railway stations.
        </p>
      </div>
    </div>
  );
}
