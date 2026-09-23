'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RailwayApiService } from '@/services/api';
import { MapPin, X, Loader2 } from 'lucide-react';

interface Station {
  code: string;
  name: string;
}

interface StationAutocompleteProps {
  value: string;
  displayValue: string;
  onChange: (code: string, name: string) => void;
  onClear: () => void;
  placeholder: string;
  iconColor: string;
}

export function StationAutocomplete({ value, displayValue, onChange, onClear, placeholder, iconColor }: StationAutocompleteProps) {
  const [query, setQuery] = useState(displayValue || value);
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync query with external displayValue changes (e.g. swap)
  useEffect(() => {
    setQuery(displayValue || value);
  }, [displayValue, value]);

  // Close dropdown on outside click
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
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const results = await RailwayApiService.searchStations(q);
      setSuggestions(results.slice(0, 8));
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
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  const handleSelect = (station: Station) => {
    setQuery(`${station.name}`);
    onChange(station.code, station.name);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center space-x-3 bg-[#1F2937] px-4 py-3 rounded-lg border border-gray-700 focus-within:border-blue-500 transition-colors">
        <MapPin className={`w-5 h-5 shrink-0 ${iconColor}`} />
        {value && (
          <span className="bg-blue-500/20 text-blue-300 text-[11px] font-bold px-2 py-0.5 rounded shrink-0 uppercase tracking-wide">
            {value}
          </span>
        )}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-transparent border-none text-white focus:outline-none flex-1 font-medium text-sm"
          autoComplete="off"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" />}
        {value && !isLoading && (
          <button onClick={handleClear} className="text-gray-500 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-[#1a2332] border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((station, i) => (
            <button
              key={station.code}
              onClick={() => handleSelect(station)}
              className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors ${
                i === selectedIndex ? 'bg-blue-600/20' : 'hover:bg-[#253347]'
              }`}
            >
              <span className="bg-gray-700 text-gray-300 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide shrink-0">
                {station.code}
              </span>
              <span className="text-white text-sm font-medium">{station.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
