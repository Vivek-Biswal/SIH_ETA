'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock3 } from 'lucide-react';
import { PassengerSearch } from './PassengerSearch';
import { PassengerJourney } from '@/components/eta/PassengerJourney';

export function PassengerDashboard() {
  const query = useSearchParams(); const router = useRouter();
  const number = query.get('train') || '', date = query.get('date') || '';
  return <div className="max-w-6xl mx-auto space-y-6 pb-8">
    <header className="pt-2 pb-2"><p className="text-xs uppercase tracking-[.18em] text-primary font-semibold mb-3">SIH ETA / Your journey, clearer</p><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Know when. Travel better.</h1><p className="text-muted-foreground mt-3">Your train’s arrival, with the information behind it.</p></header>
    {number ? <PassengerJourney key={`${number}-${date}`} number={number} date={date} compact /> : <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-9"><div className="flex items-start gap-4"><div className="rounded-2xl bg-primary/10 p-3 text-primary"><Clock3 size={28} /></div><div><p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Expected arrival</p><h2 className="text-2xl sm:text-3xl font-semibold">Your next arrival starts here.</h2><p className="text-muted-foreground mt-3 max-w-xl">Enter a train number below to see its predicted arrival, scheduled time and last reported delay — together in one place.</p><div className="flex flex-wrap gap-2 mt-5 text-xs text-muted-foreground"><span className="rounded-full border border-border px-3 py-2">Clear prediction explanations</span><span className="rounded-full border border-border px-3 py-2">Source & observation time</span></div></div></div></section>}
    <PassengerSearch onTrack={(train, startDate) => { const q = new URLSearchParams({ train }); if (startDate) q.set('date', startDate); router.push(`/dashboard?${q}`); }} />
    <p className="text-xs text-muted-foreground">All station times are in Indian Standard Time. Predictions depend on the latest available railway observations.</p>
  </div>;
}
