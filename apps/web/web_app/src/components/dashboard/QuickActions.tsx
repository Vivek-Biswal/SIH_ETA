import Link from 'next/link';
import { Search, MapPin, Activity, Route, ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react';

export function QuickActions() {
  const actions = [
    { name: 'Browse stations', icon: MapPin, href: '/stations', desc: 'Departures and facilities', color: 'text-emerald-300', bg: 'bg-emerald-400/15' },
    { name: 'Network pulse', icon: Activity, href: '/network', desc: 'Live corridor health', color: 'text-amber-300', bg: 'bg-amber-400/15' },
    { name: 'Plan a journey', icon: Route, href: '/trains', desc: 'Compare station pairs', color: 'text-violet-300', bg: 'bg-violet-400/15' },
  ];

  return <div className="space-y-3">
    <Link href="/trains" className="group relative block overflow-hidden rounded-[1.35rem] bg-[#081d42] p-5 text-white shadow-[0_18px_40px_-22px_rgba(8,29,66,.9)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-22px_rgba(8,29,66,.95)]">
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -bottom-20 right-16 h-48 w-48 rounded-full border border-blue-300/10" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200 ring-1 ring-inset ring-blue-200/20"><Search size={22} /></span>
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-blue-200"><Sparkles size={12} /> Start here</p>
            <h3 className="text-lg font-semibold tracking-tight">Find your train</h3>
            <p className="mt-1 max-w-sm text-sm leading-5 text-slate-300">Search by number or name to see its latest status and ETA.</p>
          </div>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-200 transition group-hover:text-white">Open search <ArrowUpRight size={15} /></span>
      </div>
      <div className="relative mt-5 flex items-center gap-2 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Most useful for a 5-digit train number<span className="ml-auto hidden font-mono text-[10px] text-slate-500 sm:inline">/trains</span></div>
    </Link>

    <div className="divide-y divide-border overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/70">
      {actions.map((action) => <Link key={action.name} href={action.href} className="group flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-muted/60">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${action.bg} ${action.color}`}><action.icon size={18} /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{action.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{action.desc}</span></span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>)}
    </div>
  </div>
}
