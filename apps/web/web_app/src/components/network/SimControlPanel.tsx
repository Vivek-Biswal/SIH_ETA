'use client';

import React from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { SimMetrics, SimulationState } from '@/types/simulation';

interface SimControlPanelProps {
  running:           boolean;
  speed:             number;
  state:             SimulationState;
  metrics:           SimMetrics;
  onStart:           () => void;
  onPause:           () => void;
  onReset:           () => void;
  onTriggerBottleneck: () => void;
  onRunMitigation:   () => void;
  onSetSpeed:        (m: number) => void;
}

const STATE_CONFIG: Record<SimulationState, { label: string; color: string; bg: string }> = {
  NORMAL:     { label: 'NORMAL',     color: '#10B981', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  BUILDING:   { label: 'BUILDING',   color: '#F59E0B', bg: 'bg-amber-500/10   border-amber-500/30'   },
  CRITICAL:   { label: 'CRITICAL',   color: '#EF4444', bg: 'bg-red-500/10     border-red-500/30'     },
  MITIGATION: { label: 'MITIGATION', color: '#6366F1', bg: 'bg-indigo-500/10  border-indigo-500/30'  },
  RECOVERY:   { label: 'RECOVERY',   color: '#3B82F6', bg: 'bg-blue-500/10    border-blue-500/30'    },
  RECOVERED:  { label: 'RECOVERED',  color: '#10B981', bg: 'bg-emerald-500/10 border-emerald-500/30' },
};

const SPEED_OPTIONS = [
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
];

function MetricBox({ label, value, unit = '', accent = '' }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-muted/30 rounded-lg p-3 min-w-[80px]">
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}<span className="text-sm font-normal ml-0.5 opacity-70">{unit}</span></div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5 text-center leading-tight">{label}</div>
    </div>
  );
}

export function SimControlPanel({
  running, speed, state, metrics,
  onStart, onPause, onReset,
  onTriggerBottleneck, onRunMitigation, onSetSpeed,
}: SimControlPanelProps) {
  const cfg = STATE_CONFIG[state];
  const canBottleneck  = state === 'NORMAL';
  const canMitigate    = state === 'CRITICAL' || state === 'BUILDING';
  const delayAccent    = metrics.avgDelayMinutes > 20 ? 'text-red-500' : metrics.avgDelayMinutes > 5 ? 'text-amber-500' : 'text-emerald-500';
  const congAccent     = metrics.congestionPct > 60 ? 'text-red-500' : metrics.congestionPct > 30 ? 'text-amber-500' : 'text-foreground';

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Simulation Scenario</span>
          <span className="text-[10px] text-muted-foreground/60">Agra–Jhansi Corridor · North Central Railway</span>
        </div>
        <div className={`flex items-center gap-1.5 border text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg}`} style={{ color: cfg.color }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
          {cfg.label}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <MetricBox label="Congestion" value={metrics.congestionPct} unit="%" accent={congAccent} />
        <MetricBox label="Affected Trains" value={metrics.affectedTrains} />
        <MetricBox label="Avg Delay" value={metrics.avgDelayMinutes} unit="min" accent={delayAccent} />
        <MetricBox label="Critical Sections" value={metrics.criticalSections} accent={metrics.criticalSections > 0 ? 'text-red-500' : ''} />
        <MetricBox label="Throughput" value={metrics.throughputPct} unit="%" />
        <MetricBox label="Recovery" value={metrics.recoveryPct} unit="%" accent={metrics.recoveryPct > 50 ? 'text-emerald-500' : ''} />
      </div>

      {/* Recovery progress bar (only in RECOVERY/RECOVERED) */}
      {(state === 'RECOVERY' || state === 'RECOVERED') && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="font-medium text-blue-500">NETWORK RECOVERY</span>
            <span>{metrics.recoveryPct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${metrics.recoveryPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Playback */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          <button
            onClick={running ? onPause : onStart}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md bg-background border border-border hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          <span className="text-[10px] text-muted-foreground px-1 font-medium">Speed</span>
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSetSpeed(opt.value)}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-md transition-colors ${
                speed === opt.value
                  ? 'bg-background text-foreground border border-border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Event buttons */}
        <button
          onClick={onTriggerBottleneck}
          disabled={!canBottleneck}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors shadow-sm ${
            canBottleneck
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/20 cursor-pointer'
              : 'opacity-30 cursor-not-allowed border-border text-muted-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Trigger Bottleneck
        </button>

        <button
          onClick={onRunMitigation}
          disabled={!canMitigate}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors shadow-sm ${
            canMitigate
              ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/20 cursor-pointer'
              : 'opacity-30 cursor-not-allowed border-border text-muted-foreground'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Run Network Mitigation
        </button>
      </div>

      {/* State description */}
      <div className="text-[11px] text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 border border-border/50">
        {state === 'NORMAL'     && '▶ All trains moving normally on the Agra–Jhansi corridor. Click "Trigger Bottleneck" to begin the scenario.'}
        {state === 'BUILDING'   && '⚠ Capacity reduction event active on AGC–DHO section. Trains are slowing and queuing. Congestion is building.'}
        {state === 'CRITICAL'   && '🔴 Bottleneck CRITICAL. Severe delay propagation in progress across multiple trains. Run mitigation to intervene.'}
        {state === 'MITIGATION' && '🔵 Network mitigation actions applied: train sequencing, controlled holding, and speed/headway adjustment initiated.'}
        {state === 'RECOVERY'   && '↗ Congestion clearing. Trains recovering speed and headway. Queue shrinking progressively.'}
        {state === 'RECOVERED'  && '✅ Network fully recovered. All trains returned to nominal operations on the corridor.'}
      </div>

      {/* Data integrity notice */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
        <Zap className="w-3 h-3 opacity-50" />
        This is a deterministic simulation scenario. It does not represent the current live railway situation. Simulated data is never mixed with RailRadar live data.
      </div>
    </div>
  );
}
