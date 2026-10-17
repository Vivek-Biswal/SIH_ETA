'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Network, ArrowUpRight, RefreshCw, CalendarDays } from 'lucide-react';
import { loadInsights, type Insights } from '@/services/networkInsights';
import styles from './NetworkSummary.module.css';

// This endpoint contains dated historical records, never a live network census.
export function LiveSnapshot() {
  const [data, setData] = useState<Insights | null>(null), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [revision, refresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    loadInsights('', controller.signal).then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError('Past delay insights are unavailable right now. Try again in a moment.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
    ? new Date(`${value}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Date unavailable';

  return <section className={styles.panel} aria-labelledby="network-summary-title" aria-busy={loading}>
    <div className={styles.header}><div><p className={styles.eyebrow}>A wider perspective</p><h2 id="network-summary-title">Learn from past journeys</h2></div>
      <button disabled={loading} onClick={() => refresh(n => n + 1)} aria-label="Refresh past delay insights" className={styles.refresh}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
    </div>
    <p className={styles.intro}>See where delays have built up in the past.</p>
    {error && <p role="status" className={styles.error}>{error}{data ? ' Showing the previously loaded records.' : ''}</p>}
    <dl className={styles.metrics}>
      <div><dt><span className={styles.metricIcon}><MapPin size={18} strokeWidth={1.7} /></span>Stations in the analysis</dt><dd>{loading && !data ? '…' : data ? data.station_count.toLocaleString('en-IN') : '—'}</dd></div>
      <div><dt><span className={styles.metricIcon}><Network size={18} strokeWidth={1.7} /></span>Recorded train interactions</dt><dd>{loading && !data ? '…' : data ? data.interaction_count.toLocaleString('en-IN') : '—'}</dd></div>
    </dl>
    <div className={styles.period}><CalendarDays size={13} /><span>{data ? `${date(data.period_start)} – ${date(data.period_end)}` : loading ? 'Loading the observation period…' : 'Observation period unavailable'}</span></div>
    <div className={styles.footer}><span className={styles.badge}>Historical data</span><Link href="/network" prefetch={false}>Past Delay Insights <ArrowUpRight size={15} /></Link></div>
  </section>;
}
