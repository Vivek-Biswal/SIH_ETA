'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RailwayApiService } from '@/services/api';
import { Loader2, Search, MapPin, Train, TrainFront, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface SearchResult {
  type: 'train' | 'station';
  id: string; // train_number or station_code
  name: string;
  subtitle?: string;
  raw?: any;
}

export function UnifiedSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const [trains, stations] = await Promise.allSettled([
        RailwayApiService.lookupTrains(q),
        RailwayApiService.searchStations(q)
      ]);

      const results: SearchResult[] = [];
      if (trains.status === 'fulfilled' && trains.value) {
        trains.value.slice(0, 5).forEach((t: any) => {
          const num = t.train_number || t.number;
          const name = t.train_name || t.name;
          if (num) {
            results.push({ type: 'train', id: num, name, subtitle: `Train ${num}`, raw: t });
          }
        });
      }
      if (stations.status === 'fulfilled' && stations.value) {
        stations.value.slice(0, 3).forEach((s: any) => {
          results.push({ type: 'station', id: s.code, name: s.name, subtitle: `Station ${s.code}`, raw: s });
        });
      }
      
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    setSuggestions([]);
    onSelect(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isOpen && selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        e.preventDefault();
        handleSelect(suggestions[0]);
      }
      return;
    }
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Train number, name, or station"
          className="block w-full pl-12 pr-12 py-4 sm:py-5 bg-card/80 backdrop-blur-sm border border-primary/20 rounded-2xl text-foreground text-lg shadow-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 ease-in-out"
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : query ? (
            <button onClick={() => { setQuery(''); setSuggestions([]); setIsOpen(false); }} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="py-2">
            {suggestions.map((item, i) => (
              <li key={`${item.type}-${item.id}-${i}`}>
                <button
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors ${
                    i === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${item.type === 'train' ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400' : 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'}`}>
                    {item.type === 'train' ? <TrainFront className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  {item.type === 'train' && (
                    <div className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted/30">
                      TRAIN
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
