'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RailwayApiService } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface TrainResult {
  train_number?: string;
  train_name?: string;
  number?: string;
  name?: string;
}

interface TrainAutocompleteProps {
  value: string;
  onChange: (trainNumber: string) => void;
  onSubmit: (trainNumber: string) => void;
  placeholder: string;
}

export function TrainAutocomplete({ value, onChange, onSubmit, placeholder }: TrainAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<TrainResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

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
      const results = await RailwayApiService.lookupTrains(q);
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
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
  };

  const handleSelect = (train: TrainResult) => {
    const num = train.train_number || train.number || '';
    setQuery(num);
    onChange(num);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isOpen && selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      } else {
        onSubmit(query);
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
    <div ref={wrapperRef} className="relative flex-1">
      <div className="bg-[#1F2937] px-4 py-3.5 rounded-xl border border-gray-700 flex items-center focus-within:border-blue-500 transition-colors">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-transparent border-none text-white focus:outline-none flex-1 text-sm md:text-base placeholder-gray-500"
          autoComplete="off"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-gray-500 animate-spin shrink-0" />}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-[#1a2332] border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((train, i) => {
            const num = train.train_number || train.number || '—';
            const name = train.train_name || train.name || '';
            return (
              <button
                key={`${num}-${i}`}
                onClick={() => handleSelect(train)}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors ${
                  i === selectedIndex ? 'bg-blue-600/20' : 'hover:bg-[#253347]'
                }`}
              >
                <span className="bg-gray-700 text-gray-300 text-[11px] font-bold px-2 py-0.5 rounded shrink-0">
                  {num}
                </span>
                <span className="text-white text-sm font-medium">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
