'use client';

import React from 'react';
import { NetworkZoneStatus } from '@/types/api';

interface NetworkHealthHeroProps {
  zones: NetworkZoneStatus[];
  isLoading: boolean;
}

function computeHealth(zones: NetworkZoneStatus[]): {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  normalPct: number;
  delayedPct: number;
  criticalPct: number;
} {
  if (!zones.length)
    return { label: 'No Data', sublabel: 'Awaiting telemetry', color: 'text-muted-foreground', bg: 'bg-muted/20', normalPct: 0, delayedPct: 0, criticalPct: 0 };

  const critical = zones.filter((z) => z.status === 'DISRUPTED').length;
  const congested = zones.filter((z) => z.status === 'CONGESTED').length;
  const total = zones.length;
  const criticalPct = Math.round((critical / total) * 100);
  const delayedPct = Math.round((congested / total) * 100);
  const normalPct = 100 - criticalPct - delayedPct;

  if (criticalPct >= 30) return { label: 'Critical', sublabel: 'Significant disruption', color: 'text-destructive', bg: 'bg-destructive/10', normalPct, delayedPct, criticalPct };
  if (congested >= Math.ceil(total / 2)) return { label: 'Degraded', sublabel: 'Multiple sections affected', color: 'text-warning', bg: 'bg-warning/10', normalPct, delayedPct, criticalPct };
  if (congested > 0 || critical > 0) return { label: 'Minor Delays', sublabel: 'Some sections experiencing delays', color: 'text-warning', bg: 'bg-warning/10', normalPct, delayedPct, criticalPct };
  return { label: 'Operational', sublabel: 'Network operating normally', color: 'text-success', bg: 'bg-success/10', normalPct, delayedPct, criticalPct };
}

export const NetworkHealthHero: React.FC<NetworkHealthHeroProps> = ({ zones, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-4" />
        <div className="h-8 bg-muted rounded w-40 mb-6" />
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded flex-1" />)}
        </div>
      </div>
    );
  }

  const { label, sublabel, color, bg, normalPct, delayedPct, criticalPct } = computeHealth(zones);

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Health State */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
            <span className={`w-4 h-4 rounded-full ${color.replace('text-', 'bg-')}`} />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Network Health</div>
            <div className={`text-2xl font-bold ${color}`}>{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>
          </div>
        </div>

        <div className="hidden sm:block w-px h-16 bg-border mx-2" />

        {/* Distribution */}
        <div className="flex flex-wrap gap-6 flex-1">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground font-medium">Normal</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-success">{normalPct}%</span>
              <span className="w-2 h-2 rounded-full bg-success" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground font-medium">Minor Delay</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-warning">{delayedPct}%</span>
              <span className="w-2 h-2 rounded-full bg-warning" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground font-medium">Critical</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-destructive">{criticalPct}%</span>
              <span className="w-2 h-2 rounded-full bg-destructive" />
            </div>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="hidden md:flex flex-col justify-center w-48 gap-1">
          <div className="text-xs text-muted-foreground font-medium mb-1">Zone Distribution</div>
          <div className="flex h-3 w-full rounded-full overflow-hidden gap-0.5">
            {normalPct > 0 && <div className="bg-success transition-all" style={{ width: `${normalPct}%` }} />}
            {delayedPct > 0 && <div className="bg-warning transition-all" style={{ width: `${delayedPct}%` }} />}
            {criticalPct > 0 && <div className="bg-destructive transition-all" style={{ width: `${criticalPct}%` }} />}
          </div>
          <div className="text-xs text-muted-foreground">{zones.length} zones monitored</div>
        </div>
      </div>
    </div>
  );
};
