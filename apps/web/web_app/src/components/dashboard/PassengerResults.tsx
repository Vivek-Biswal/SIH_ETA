'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { routeSearch, time, type SearchPage } from '@/services/passenger';
import { PassengerSearch } from './PassengerSearch';

export function PassengerResults() {
  const query = useSearchParams(); const from = query.get('from') || '', to = query.get('to') || '', date = query.get('date') || '';
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [data, setData] = useState<SearchPage | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!from && !to) return;
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    routeSearch(from, to, date, page, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [from, to, date, page, retry]);
  return <div className="max-w-5xl mx-auto space-y-6 pb-8"><Link href="/dashboard" className="text-primary text-sm">← Back to dashboard</Link><header><p className="text-xs uppercase tracking-widest text-primary mb-3">Plan your journey</p><h1 className="text-3xl font-semibold">{from || to ? `${from} → ${to}` : 'Find your train'}</h1><p className="text-muted-foreground mt-2">{date ? `Travel date: ${date}` : 'Choose a train to view its current status and ETA.'}</p></header>
    {!from || !to ? <PassengerSearch /> : <>
      {loading && <p role="status" className="rounded-2xl bg-card p-8 border border-border">Searching the railway timetable…</p>}
      {error && <div role="alert" className="rounded-2xl bg-card border border-border p-6"><p>{error}</p><button onClick={() => setRetry(n => n + 1)} className="text-primary mt-3">Try again</button></div>}
      {data && <><p className="text-sm text-muted-foreground">{data.total} trains · Timetable data · Live status is checked when you open a train.</p>{!data.trains.length && <p className="bg-card border border-border rounded-xl p-6">No trains found for these stations and date.</p>}
        <div className="space-y-3">{data.trains.map(train => { const q = new URLSearchParams({ station: to }); if (date) q.set('date', date); return <Link key={train.train_number} href={`/trains/${train.train_number}?${q}`} className="block rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-primary transition-colors"><div className="flex flex-wrap justify-between gap-4"><div><span className="text-xs text-primary font-semibold">{train.train_number}</span><h2 className="font-semibold text-lg mt-1">{train.train_name}</h2><p className="text-xs text-muted-foreground mt-2">{Array.isArray(train.days_of_run) ? `Runs: ${train.days_of_run.join(', ')}` : 'Running days unavailable'}</p></div><div className="text-sm"><p>{time(train.departure_time)} → {time(train.arrival_time)}</p><p className="text-muted-foreground mt-2">{typeof train.duration_minutes === 'number' ? `${Math.floor(train.duration_minutes / 60)}h ${train.duration_minutes % 60}m` : 'Duration unavailable'}</p><p className="text-primary mt-3 font-semibold">View ETA & route →</p></div></div></Link>; })}</div>
        <nav aria-label="Search results pages" className="flex justify-between items-center"><button className="border border-border rounded-xl px-4 py-2 disabled:opacity-40" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-sm">Page {page}</span><button className="border border-border rounded-xl px-4 py-2 disabled:opacity-40" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>Next</button></nav>
      </>}
    </>}
  </div>;
}
