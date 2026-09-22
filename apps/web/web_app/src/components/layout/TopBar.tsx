'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Sun, Moon, Train, MapPin, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { RailwayApiService } from '@/services/api';

export const TopBar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ type: 'TRAIN' | 'STATION', id: string, name: string, detail?: string }[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Quick local fuzzy search using the backend snapshot
    const timer = setTimeout(() => {
      RailwayApiService.searchTrains().then(trains => {
        const results: typeof searchResults = [];
        const q = searchQuery.toLowerCase();
        
        // Search trains
        trains.forEach(t => {
          if (t.train_number.toLowerCase().includes(q) || t.train_name.toLowerCase().includes(q)) {
            results.push({
              type: 'TRAIN',
              id: t.train_number,
              name: t.train_name,
              detail: t.train_number
            });
          }
        });

        // Extract and search unique stations
        const stationMap = new Map<string, string>();
        trains.forEach(t => {
          if (t.current_station) stationMap.set(t.current_station.code, t.current_station.name);
          if (t.next_station) stationMap.set(t.next_station.code, t.next_station.name);
        });

        stationMap.forEach((name, code) => {
          if (name.toLowerCase().includes(q) || code.toLowerCase().includes(q)) {
            results.push({
              type: 'STATION',
              id: code,
              name: name,
              detail: code
            });
          }
        });

        setSearchResults(results.slice(0, 8)); // Limit to top 8
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (result: typeof searchResults[0]) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (result.type === 'TRAIN') {
      router.push(`/trains/${result.id}`);
    } else {
      router.push(`/stations`); // The stations page doesn't have a direct /id route yet, but the user requested one canonical view
    }
  };

  return (
    <header className="h-16 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-border)] px-4 md:px-6 flex items-center justify-between flex-shrink-0 z-40 relative">
      {/* Global Quick Search & Mobile Menu */}
      <div className="flex items-center gap-3 flex-1 md:w-96 md:flex-none">
        <button className="md:hidden p-1.5 text-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)] rounded hover:bg-[var(--sidebar-hover)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
        <div className="hidden md:block">
          <span className="text-[var(--sidebar-foreground)] font-medium">EQUINOX01</span>
        </div>
      </div>

      {/* Global Search Center Placeholder */}
      <div className="hidden md:flex flex-1 justify-center max-w-xl mx-4 relative" ref={searchRef}>
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-1.5 border border-border rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm transition-colors"
            placeholder="Search trains, stations, routes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden z-50">
              {searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <ul className="py-2 max-h-96 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <li 
                      key={`${result.type}-${result.id}-${idx}`}
                      className="px-4 py-2 hover:bg-muted cursor-pointer flex flex-col transition-colors"
                      onClick={() => handleSelectResult(result)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-background px-1.5 py-0.5 rounded border border-border">
                          {result.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.type === 'TRAIN' ? <Train className="w-4 h-4 text-primary" /> : <MapPin className="w-4 h-4 text-primary" />}
                        <span className="text-sm font-semibold text-foreground">
                          {result.type === 'TRAIN' ? `${result.detail} ${result.name}` : `${result.name} — ${result.detail}`}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
        
        <div className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1.5 rounded-md transition-colors">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            S
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">
            Sneha
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
