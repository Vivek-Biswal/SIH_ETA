'use client';
import { useEffect, useState } from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { BrandMark } from './BrandMark';
import { useRouter } from 'next/navigation';
import { lookup, type SearchTrain } from '@/services/passenger';

export function TopBar() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState(''), [message, setMessage] = useState('');
  const [items, setItems] = useState<SearchTrain[]>([]), [open, setOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (query.trim().length < 2) { setItems([]); setMessage('Type at least two characters.'); return; }
    if (/^\d{5}$/.test(query.trim())) { setItems([{ train_number: query.trim(), train_name: 'Open train status and ETA' }]); setMessage(''); return; }
    setItems([]); setMessage('Searching trains…');
    const timer = setTimeout(() => lookup(query, controller.signal).then(rows => {
      if (!controller.signal.aborted) { setItems(rows.slice(0,8)); setMessage(rows.length ? '' : 'No trains found.'); }
    }).catch(() => { if (!controller.signal.aborted) setMessage('Train search unavailable. Please try again.'); }), 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  return <header className="h-18 bg-card border-b border-border px-5 md:px-7 flex items-center justify-between gap-5 shrink-0 z-40">
    <Link href="/dashboard" className="flex gap-3 items-center font-semibold shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"><BrandMark size="small" /><span className="text-base tracking-tight">Etaernal</span></Link>
    <div className="hidden sm:block relative w-full max-w-md" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
      <input aria-label="Find a train by name or number" placeholder="Quick train lookup" value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && items.length) { router.push(`/trains/${items[0].train_number}`); setOpen(false); setQuery(''); } }} className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-xs focus:outline-2 focus:outline-ring" />
      {open && query && <div className="absolute top-full mt-2 w-full rounded-xl bg-card border border-border shadow-xl max-h-80 overflow-auto">
        {message && <p role="status" className="p-4 text-sm text-muted-foreground">{message}</p>}
        {items.map(item => <Link key={item.train_number} href={`/trains/${item.train_number}`} onClick={() => { setOpen(false); setQuery(''); }} className="block p-3 text-sm hover:bg-muted"><span className="text-primary font-semibold mr-2">{item.train_number}</span>{item.train_name}</Link>)}
      </div>}
    </div>
    <button aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-3 rounded-xl border border-border hover:bg-muted text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"><Sun size={18} className="hidden dark:block" /><Moon size={18} className="dark:hidden" /></button>
  </header>;
}
