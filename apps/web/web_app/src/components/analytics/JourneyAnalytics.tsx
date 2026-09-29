'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loadJourney, time, type Status } from '@/services/passenger';
import { observations, summarize, exportCSV } from '@/services/journeyAnalytics';

const button = 'rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-40';
const field = 'mt-2 block w-full rounded-xl border border-border bg-background p-3';
const panel = 'rounded-2xl border border-border bg-card p-5';
export default function JourneyAnalytics({ embedded = false }: { embedded?: boolean }) {
  const [number,setNumber] = useState(''), [date,setDate] = useState('');
  const [status,setStatus] = useState<Status|null>(null);
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [received,setReceived] = useState('');
  const [tolerance,setTolerance] = useState(5), [filter,setFilter] = useState('all');
  const controller = useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function load(refresh = false) {
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    const train = refresh && status ? status.train_number : number;
    const day = refresh && status ? status.date : date;
    if (!refresh) { setStatus(null); setReceived(''); }
    setBusy(true); setError('');
    try {
      const result = await loadJourney(train,day,request.signal,false);
      if (!result.status) throw new Error(result.statusError || 'Journey observations unavailable.');
      if (!request.signal.aborted) { setStatus(result.status); setReceived(new Date().toISOString()); setFilter('all'); }
    } catch(e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load analytics.'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  const rows = status ? observations(status, Date.parse(received)) : [];
  const stats = summarize(rows,tolerance), measured = rows.filter(r=>r.delay !== null);
  const visible = rows.filter(r=>filter === 'all' || (filter === 'measured' ? r.delay !== null : r.delay !== null && r.delay > tolerance));
  const min = Math.min(0,...measured.map(r=>r.delay!)), max = Math.max(10,...measured.map(r=>r.delay!));
  const y = (delay:number) => 170 - (delay-min)/(max-min)*140;
  function download() {
    if (!status) return;
    const csv = exportCSV(rows,status.train_number,status.date);
    const filename = `journey-${status.train_number}-${status.date}.csv`;
    const bridge = (window as Window & { JourneyExport?: { postMessage: (value: string) => void } }).JourneyExport;
    if (bridge) { bridge.postMessage(JSON.stringify({ filename, csv })); return; }
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a'); link.href=url; link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="mx-auto max-w-7xl space-y-6 pb-6">
    {embedded ? <header><p className="text-xs font-semibold uppercase tracking-widest text-primary">Your journey in numbers</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Understand the delays.</h2><p className="mt-2 text-sm text-muted-foreground">Compare reported arrivals with the timetable for one train journey.</p></header> : (<header className="rounded-3xl bg-[#071c40] p-6 text-white sm:p-9"><p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Journey analytics</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Understand your train’s delays.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">See how arrival times changed along one journey, using reported completed-stop observations. Every number below comes from the selected train.</p></header>)}
    <form onSubmit={e=>{e.preventDefault(); void load();}} className={`${panel} flex flex-wrap items-end gap-4`}>
      <label className="min-w-40 flex-1 text-sm">Train number<input required pattern="[0-9]{5}" maxLength={5} inputMode="numeric" value={number} onChange={e=>setNumber(e.target.value)} placeholder="e.g. 12423" className={field}/></label>
      <label className="min-w-40 flex-1 text-sm">Journey start date · optional<input type="date" value={date} onChange={e=>setDate(e.target.value)} className={field}/></label>
      <button disabled={busy} className={`${button} bg-primary text-primary-foreground`}>{busy?'Loading observations…':'Analyze journey'}</button>
    </form>
    {error && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{error}{status && ' Previous snapshot remains visible; refresh failed.'}</p>}
    {!status && !busy && !error && <section className="rounded-2xl border border-dashed border-border p-10 text-center"><h2 className="text-xl font-semibold">Start with a train you care about</h2><p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">Enter its five-digit number above for punctuality, arrival differences and station observations. No train is selected automatically.</p></section>}
    {status && <>
      <section className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-primary">{status.data_source} snapshot · journey {status.date}</p><h2 className="mt-1 text-xl font-semibold">{status.train_number} · {status.train_name}</h2><p className="mt-2 text-xs text-muted-foreground">Retrieved {time(received)} · Observation time {time(status.last_known_location?.updated_at)}</p></div><div className="flex gap-2"><button disabled={busy} onClick={()=>void load(true)} className={button}>Refresh</button><button disabled={!rows.length} onClick={download} className={button}>Export CSV</button></div></section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ['Measured arrivals',String(stats.measured),`of ${rows.length} reported route points`],
        ['Within chosen tolerance',stats.percentage === null?'Unavailable':`${stats.percentage.toFixed(1)}%`,`${stats.onTime} of ${stats.measured} measured arrivals`],
        ['Average arrival delay',stats.average === null?'Unavailable':`${stats.average.toFixed(1)} min`,'Early arrivals count as zero delay'],
        ['Largest arrival delay',stats.maximum === null?'Unavailable':`${stats.maximum.toFixed(1)} min`,'Among measured completed stops'],
      ].map(([label,value,note])=><section key={label} className={panel}><h3 className="text-sm text-muted-foreground">{label}</h3><p className="my-3 text-3xl font-semibold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{note}</p></section>)}</div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className={panel}><h2 className="font-semibold">How arrival delays changed</h2><p className="mt-1 text-xs text-muted-foreground">Route order, not a network-wide historical trend. Exact values are in the table.</p>{measured.length ? <svg viewBox="0 0 780 210" role="img" aria-label="Arrival difference in minutes by route order" className="mt-5 w-full"><line x1="40" x2="740" y1={y(0)} y2={y(0)} stroke="currentColor" opacity=".2"/><text x="2" y="25" fill="currentColor" fontSize="12">{max.toFixed(0)}m</text><text x="2" y="175" fill="currentColor" fontSize="12">{min.toFixed(0)}m</text>{measured.map(r=><circle key={r.sequence} cx={40+r.sequence/Math.max(1,rows.length-1)*700} cy={y(r.delay!)} r="4" fill={r.delay!>tolerance?'#f59e0b':'#10b981'}><title>{r.name}: {r.delay!.toFixed(1)} min</title></circle>)}<text x="40" y="202" fill="currentColor" fontSize="12">Origin</text><text x="665" y="202" fill="currentColor" fontSize="12">Destination</text></svg>:<p className="py-12 text-sm text-muted-foreground">No completed stops with comparable scheduled and reported actual arrivals are available yet.</p>}</section>
        <section className={panel}><h2 className="font-semibold">Punctuality at measured stops</h2><label className="mt-4 block text-sm">Allow arrivals up to<select value={tolerance} onChange={e=>setTolerance(Number(e.target.value))} className={field}>{[0,5,15].map(n=><option key={n} value={n}>{n} minutes late</option>)}</select></label><div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">{stats.percentage !== null && <><div className="bg-emerald-500" style={{width:`${stats.percentage}%`}}/><div className="flex-1 bg-amber-500"/></>}</div><p className="mt-4 text-sm">{stats.onTime} within tolerance · {stats.late} later</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{stats.excluded} route points excluded. Only completed stops with dated arrival observations are counted. Passing stations may be included. This measures one journey’s stops, not all trains on the network.</p></section>
      </div>
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="font-semibold">Arrival observations</h2><select aria-label="Filter arrival observations" value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-border bg-background p-2 text-sm"><option value="all">All route points ({rows.length})</option><option value="measured">Measured arrivals ({stats.measured})</option><option value="late">Later than tolerance ({stats.late})</option></select></div><div className="max-h-[480px] overflow-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="sticky top-0 bg-muted"><tr>{['Station','Scheduled arrival','Reported actual','Difference'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{visible.map(r=><tr key={r.sequence} className="border-t border-border"><td className="p-4">{r.sequence+1}. {r.name}<span className="block text-xs text-muted-foreground">{r.code}</span></td><td className="p-4">{time(r.scheduled)}</td><td className="p-4">{time(r.actual)}</td><td className="p-4">{r.delay === null?'Not measured':r.delay === 0?'On schedule':`${Math.abs(r.delay).toFixed(1)} min ${r.delay<0?'early':'late'}`}</td></tr>)}</tbody></table>{!visible.length && <p className="p-6 text-sm text-muted-foreground">No observations match this filter.</p>}</div></section>
      <Link href={`/trains/${status.train_number}?date=${encodeURIComponent(status.date)}`} className="inline-block text-sm font-semibold text-primary">View this train’s ETA and route →</Link>
    </>}
    <aside className="rounded-2xl border border-border p-5"><h2 className="font-semibold">About ETA prediction accuracy</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Arrival delay and prediction error are different. Accuracy requires a saved prediction made before arrival, paired with the observed arrival at the same station and journey. Those paired records are not available in this view, so no accuracy score is displayed.</p></aside>
  </div>;
}

