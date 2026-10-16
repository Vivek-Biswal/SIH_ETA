'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, MapPin, Search, TrainFront, X } from 'lucide-react';
import { lookup, stations } from '@/services/passenger';
import styles from './UnifiedSearch.module.css';

export interface SearchResult { type: 'train' | 'station'; id: string; name: string; subtitle?: string }

export function UnifiedSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [query, setQuery] = useState(''), [items, setItems] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [message, setMessage] = useState('');
  const [selected, setSelected] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const directTrain = /^\d{5}$/.test(query.trim());

  useEffect(() => {
    const value = query.trim();
    const controller = new AbortController();
    setItems([]); setSelected(-1); setMessage('');
    if (value.length < 2) { setLoading(false); return; }
    // A complete train number can go straight to status/ETA, saving lookup calls.
    if (/^\d{5}$/.test(value)) {
      setLoading(false); setItems([{ type: 'train', id: value, name: `Track train ${value}`, subtitle: 'Check its latest status and arrival' }]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const numeric = /^\d+$/.test(value);
      const [trains, stops] = await Promise.allSettled([lookup(value, controller.signal), numeric ? Promise.resolve([]) : stations(value, controller.signal)]);
      if (controller.signal.aborted) return;
      const next: SearchResult[] = [];
      if (trains.status === 'fulfilled') for (const t of trains.value.slice(0, 5)) next.push({ type: 'train', id: t.train_number, name: t.train_name, subtitle: `Train ${t.train_number}` });
      if (stops.status === 'fulfilled') for (const s of stops.value.slice(0, 3)) next.push({ type: 'station', id: s.code, name: s.name, subtitle: `Station ${s.code}` });
      setItems(next); setLoading(false);
      setMessage(next.length ? '' : trains.status === 'rejected' || stops.status === 'rejected' ? 'Search is unavailable right now. You can still enter a 5-digit train number.' : 'No matching trains or stations. Try a train number or station code.');
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  function choose(item: SearchResult) { setOpen(false); setQuery(''); setItems([]); onSelect(item); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (directTrain) choose({ type: 'train', id: query.trim(), name: `Train ${query.trim()}` });
    else if (!loading && items.length) choose(items[Math.max(0, selected)]);
    else { setOpen(true); input.current?.focus(); }
  }
  const expanded = open && query.trim().length >= 2;
  return <div className={styles.search} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <form onSubmit={submit} role="search" aria-label="Find a train or station" className={styles.field}>
      <Search size={19} className={styles.searchIcon} aria-hidden="true" />
      <input ref={input} role="combobox" aria-label="Train number, name or station" aria-expanded={expanded} aria-controls={`${id}-results`} aria-autocomplete="list" aria-activedescendant={selected >= 0 ? `${id}-${selected}` : undefined}
        value={query} placeholder="Train number, name or station" autoComplete="off" maxLength={80}
        onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setSelected(-1); }
          if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setSelected(v => Math.min(v + 1, items.length - 1)); }
          if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setSelected(v => Math.max(v - 1, 0)); }
        }} />
      {query && !loading && <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => { setQuery(''); setOpen(false); input.current?.focus(); }}><X size={15} /></button>}
      <button className={styles.submit} type="submit" aria-label="Search railway information">{loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={19} />}</button>
    </form>
    {expanded && <div className={styles.dropdown}>
      <ul id={`${id}-results`} role="listbox" aria-label="Matching trains and stations">
        {items.map((item, index) => <li key={`${item.type}-${item.id}`} role="none"><button type="button" role="option" id={`${id}-${index}`} aria-selected={selected === index} className={styles.option} onMouseDown={e => e.preventDefault()} onClick={() => choose(item)}>
          <span className={styles.resultIcon}>{item.type === 'train' ? <TrainFront size={18} /> : <MapPin size={18} />}</span>
          <span className={styles.resultText}><strong>{item.name}</strong><span>{item.subtitle}</span></span><ArrowRight size={14} className={styles.resultArrow} />
        </button></li>)}
      </ul>
      {(loading || message) && <p role="status" className={styles.message}>{loading ? 'Finding matching trains and stations…' : message}</p>}
    </div>}
  </div>;
}
