'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock3, RefreshCw, Route, Wifi } from 'lucide-react';
import { RailwayApiService } from '@/services/api';

type SnapshotStats = {
  active_trains: number | null;
  active_routes: number | null;
  avg_delay_mins: number | null;
};

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStats(payload: unknown): SnapshotStats | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const nested = record.data && typeof record.data === 'object' ? record.data as Record<string, unknown> : record;
  const stats = {
    active_trains: readNumber(nested.active_trains),
    active_routes: readNumber(nested.active_routes),
    avg_delay_mins: readNumber(nested.avg_delay_mins),
  };
  return Object.values(stats).some((value) => value !== null) ? stats : null;
}

function statusForDelay(delay: number | null) {
  if (delay === null) return { label: 'Waiting for data', tone: 'text-slate-300', dot: 'bg-slate-400' };
  if (delay <= 5) return { label: 'Network moving well', tone: 'text-emerald-200', dot: 'bg-emerald-400' };
  if (delay <= 15) return { label: 'Some delays building', tone: 'text-amber-200', dot: 'bg-amber-400' };
  return { label: 'Network under pressure', tone: 'text-rose-200', dot: 'bg-rose-400' };
}

function metricValue(value: number | null, suffix = '') {
  return value === null ? '—' : `${value.toLocaleString()}${suffix}`;
}

export function LiveSnapshot() {
  const [stats, setStats] = useState<SnapshotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    RailwayApiService.getDashboardStats()
      .then((payload) => {
        if (!active) return;
        const next = normalizeStats(payload);
        setStats(next);
        setError(!next);
        setUpdatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      })
      .catch(() => { if (active) { setStats(null); setError(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  const status = statusForDelay(stats?.avg_delay_mins ?? null);

  return <section className="relative isolate overflow-hidden rounded-[1.6rem] bg-[#081d42] p-5 text-white shadow-[0_20px_46px_-25px_rgba(8,29,66,.85)] sm:p-6">
    <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full border border-blue-200/10" />
    <div className="pointer-events-none absolute -bottom-28 right-20 -z-10 h-64 w-64 rounded-full border border-blue-200/5" />
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-blue-200"><Wifi size={13} /> Live network pulse</div>
        <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${status.tone}`}><span className={`h-2 w-2 rounded-full ${status.dot} ${loading ? 'animate-pulse' : ''}`} />{loading ? 'Connecting to network data…' : status.label}</p>
      </div>
      <button onClick={() => setRevision((value) => value + 1)} disabled={loading} aria-label="Refresh network pulse" className="rounded-xl border border-white/15 p-2 text-blue-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
    </div>

    <div className="mt-6 grid grid-cols-3 divide-x divide-white/15">
      <div className="pr-3 sm:pr-4"><div className="flex items-center gap-1.5 text-slate-300"><Activity size={14} className="text-blue-300" /><span className="text-[11px] leading-4">Active trains</span></div><p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{loading ? '…' : metricValue(stats?.active_trains ?? null)}</p></div>
      <div className="px-3 sm:px-4"><div className="flex items-center gap-1.5 text-slate-300"><Route size={14} className="text-violet-300" /><span className="text-[11px] leading-4">Routes monitored</span></div><p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{loading ? '…' : metricValue(stats?.active_routes ?? null)}</p></div>
      <div className="pl-3 sm:pl-4"><div className="flex items-center gap-1.5 text-slate-300"><Clock3 size={14} className="text-amber-300" /><span className="text-[11px] leading-4">Average delay</span></div><p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{loading ? '…' : metricValue(stats?.avg_delay_mins ?? null, 'm')}</p></div>
    </div>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-slate-400"><span>{error ? 'Live metrics are unavailable right now.' : updatedAt ? `Updated ${updatedAt}` : 'Reading current network conditions'}</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-slate-300">Passenger view</span></div>
  </section>;
}
