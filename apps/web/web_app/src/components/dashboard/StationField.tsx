'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { stations, type Station } from '@/services/passenger';

const cache = new Map<string, Station[]>();
export function StationField({ label, value, onChange }: { label: string; value: Station | null; onChange: (station: Station | null) => void }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Station[]>([]);
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(-1);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || value) return;
    const controller = new AbortController();
    const query = text.trim();
    setActive(-1);
    if (query.length < 2) { setItems([]); setMessage('Enter a city, station name or code — e.g., Delhi.'); return; }
    setItems(cache.get(query) || []);
    setMessage(cache.has(query) ? '' : 'Searching stations…');
    const timer = setTimeout(async () => {
      try {
        const result = await stations(query, controller.signal);
        if (controller.signal.aborted) return;
        cache.set(query, result); if (cache.size > 30) cache.delete(cache.keys().next().value!);
        setItems(result.slice(0, 8)); setMessage(result.length ? '' : 'No stations found. Try another name or code.');
      } catch { if (!controller.signal.aborted) { setItems([]); setMessage('Station search unavailable. Please try again.'); } }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text, open, value]);
  function select(station: Station) { onChange(station); setText(''); setOpen(false); }
  return <div className="relative min-w-0" ref={root} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <label className="block text-xs font-semibold text-muted-foreground mb-2" htmlFor={id}>{label}</label>
    <input id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="e.g., Delhi or NDLS" autoComplete="off" value={value ? `${value.name} (${value.code})` : text}
      onFocus={() => setOpen(true)} onChange={e => { onChange(null); setText(e.target.value); setOpen(true); }}
      onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, items.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); } if (e.key === 'Enter' && open) { e.preventDefault(); if (items[active]) select(items[active]); } }} />
    {open && !value && <div id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`} className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-popover shadow-xl max-h-72 overflow-auto">
      {message && <p role="status" className="p-4 text-sm text-muted-foreground">{message}</p>}
      {items.map((s, i) => <button type="button" role="option" aria-selected={active === i} id={`${id}-${i}`} key={s.code} onClick={() => select(s)} className={`block w-full text-left p-3 text-sm hover:bg-muted ${active === i ? 'bg-muted' : ''}`}><span className="text-primary font-semibold mr-3">{s.code}</span>{s.name}</button>)}
    </div>}
  </div>;
}
