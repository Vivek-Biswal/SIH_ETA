'use client';

import { useEffect, useState } from 'react';
import { Clock3, TrainFront, MapPin, ArrowUpRight } from 'lucide-react';
import type { SearchResult } from './UnifiedSearch';
import styles from './PassengerDashboard.module.css';

function readRecent(): SearchResult[] {
  try {
    const data = JSON.parse(localStorage.getItem('sih_recent_searches') || '[]');
    return Array.isArray(data) ? data.filter(item => item && typeof item.name === 'string' && typeof item.id === 'string' &&
      (item.type === 'train' && /^\d{5}$/.test(item.id) || item.type === 'station' && /^[A-Z0-9]{2,10}$/.test(item.id))) : [];
  } catch { return []; }
}

export function RecentSearches({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [recent, setRecent] = useState<SearchResult[]>([]);
  useEffect(() => {
    const read = () => setRecent(readRecent());
    read(); window.addEventListener('storage', read); window.addEventListener('etaernal-search-history-changed', read);
    return () => { window.removeEventListener('storage', read); window.removeEventListener('etaernal-search-history-changed', read); };
  }, []);
  return <section aria-labelledby="recent-searches-title" className={styles.recent}>
    <div className={styles.sectionHeading}><h2 id="recent-searches-title" className={styles.recentTitle}><Clock3 size={16} /> Recently explored</h2><span>Pick up where you left off</span></div>
    {recent.length ? <div className={styles.recentGrid}>{recent.slice(0, 4).map(item => <button key={`${item.type}-${item.id}`} onClick={() => onSelect(item)} className={styles.recentItem}>
      <span className={styles.recentIcon}>{item.type === 'train' ? <TrainFront size={17} /> : <MapPin size={17} />}</span>
      <span className={styles.recentText}><strong>{item.id}</strong><span>{item.name}</span></span><ArrowUpRight size={15} className="shrink-0 text-muted-foreground" />
    </button>)}</div> : <p className={styles.recentEmpty}><Clock3 size={18} />Your recent train and station searches will appear here.</p>}
  </section>;
}

export function saveRecentSearch(result: SearchResult) {
  try {
    const recent = [result, ...readRecent().filter(item => item.id !== result.id || item.type !== result.type)].slice(0, 5);
    localStorage.setItem('sih_recent_searches', JSON.stringify(recent));
    window.dispatchEvent(new Event('etaernal-search-history-changed'));
  } catch { /* Browsing remains available if device storage is disabled. */ }
}
