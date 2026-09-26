'use client';

import { useEffect, useState } from 'react';
import { Clock, TrainFront, MapPin } from 'lucide-react';
import type { SearchResult } from './UnifiedSearch';

export function RecentSearches({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [recent, setRecent] = useState<SearchResult[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sih_recent_searches');
      if (stored) {
        setRecent(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  if (recent.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Clock size={16} /> Recent Searches
      </h3>
      <div className="flex flex-wrap gap-2">
        {recent.slice(0, 4).map((item, i) => (
          <button
            key={`${item.id}-${i}`}
            onClick={() => onSelect(item)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/50 hover:bg-muted transition-colors text-sm"
          >
            {item.type === 'train' ? (
              <TrainFront size={14} className="text-blue-500" />
            ) : (
              <MapPin size={14} className="text-emerald-500" />
            )}
            <span className="font-medium">{item.id}</span>
            <span className="text-muted-foreground truncate max-w-[120px] hidden sm:inline-block">
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function saveRecentSearch(result: SearchResult) {
  try {
    const stored = localStorage.getItem('sih_recent_searches');
    let recent: SearchResult[] = stored ? JSON.parse(stored) : [];
    
    // Remove if exists
    recent = recent.filter(r => r.id !== result.id);
    
    // Add to start
    recent.unshift(result);
    
    // Keep max 5
    if (recent.length > 5) recent = recent.slice(0, 5);
    
    localStorage.setItem('sih_recent_searches', JSON.stringify(recent));
  } catch (e) {}
}
