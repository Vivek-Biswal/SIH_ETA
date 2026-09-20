'use client';

import React from 'react';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Reports
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Generate, export, and analyze historical delay reports
        </p>
      </div>

      <div className="flex flex-col items-center justify-center bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-xl py-24 shadow-sm text-center">
        <div className="bg-[var(--color-surface-hover)] p-4 rounded-full mb-4">
          <FileText className="w-8 h-8 text-[var(--color-brand-blue)]" />
        </div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Reporting Engine Coming Soon</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md">
          This module will allow you to run complex queries on historical delay metrics, zone performance, and create downloadable PDF/Excel reports.
        </p>
      </div>
    </div>
  );
}
