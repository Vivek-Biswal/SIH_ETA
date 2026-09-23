'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpDown, TrainFront, Route } from 'lucide-react';
import { StationField } from './StationField';
import { type Station } from '@/services/passenger';

export function PassengerSearch({ onTrack }: { onTrack?: (number: string, date: string) => void }) {
  const router = useRouter();
  const [from, setFrom] = useState<Station | null>(null), [to, setTo] = useState<Station | null>(null);
  const [date, setDate] = useState(''), [startDate, setStartDate] = useState(''), [number, setNumber] = useState('');
  const [error, setError] = useState('');
  return <div className="grid lg:grid-cols-2 gap-5">
    <form className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm" onSubmit={e => { e.preventDefault(); if (!from || !to || from.code === to.code) { setError('Select different origin and destination stations.'); return; } const q = new URLSearchParams({ from: from.code, to: to.code }); if (date) q.set('date', date); router.push(`/trains?${q}`); }}>
      <h2 className="font-semibold text-lg flex items-center gap-2"><Route size={20} className="text-primary" /> Find a route</h2>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2"><StationField label="Origin station" value={from} onChange={setFrom} /><button type="button" aria-label="Swap stations" className="p-3 rounded-xl hover:bg-muted" onClick={() => { setFrom(to); setTo(from); }}><ArrowUpDown size={18} /></button><StationField label="Destination station" value={to} onChange={setTo} /></div>
      <label className="block text-xs font-semibold text-muted-foreground">Travel date · optional<input aria-label="Travel date" type="date" value={date} onChange={e => setDate(e.target.value)} className="block mt-2 rounded-xl border border-border bg-background px-3 py-2 text-foreground w-full" /></label>
      <button className="w-full rounded-xl bg-primary text-primary-foreground p-3 font-semibold flex items-center justify-center gap-2">Search trains <ArrowRight size={18} /></button>
    </form>
    <form className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm" onSubmit={e => { e.preventDefault(); if (!/^\d{5}$/.test(number.trim())) { setError('Enter a five-digit train number.'); return; } setError(''); if (onTrack) onTrack(number.trim(), startDate); else router.push(`/trains/${number.trim()}${startDate ? `?date=${startDate}` : ''}`); }}>
      <h2 className="font-semibold text-lg flex items-center gap-2"><TrainFront size={20} className="text-primary" /> Have a train number?</h2>
      <label className="block text-xs font-semibold text-muted-foreground">Train number<input aria-label="Train number" className="block w-full mt-2 rounded-xl border border-border bg-background p-3 text-sm text-foreground" placeholder="5-digit number, e.g., 12423" inputMode="numeric" maxLength={5} value={number} onChange={e => setNumber(e.target.value)} required pattern="[0-9]{5}" /></label>
      <label className="block text-xs font-semibold text-muted-foreground">Journey start date · optional<input aria-label="Journey start date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block mt-2 rounded-xl border border-border bg-background px-3 py-2 text-foreground w-full" /></label>
      <button className="w-full rounded-xl bg-primary/10 text-primary p-3 font-semibold hover:bg-primary/20">View ETA & train status</button>
    </form>
    {error && <p role="alert" className="text-destructive lg:col-span-2">{error}</p>}
  </div>;
}
