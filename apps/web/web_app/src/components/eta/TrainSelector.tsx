'use client';

import React from 'react';
import { TrainStatus } from '@/types/api';
import { Search, Train, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TrainSelectorProps {
  trains: TrainStatus[];
  selectedTrain: TrainStatus | null;
  onSelectTrain: (train: TrainStatus) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isLoading: boolean;
}

export const TrainSelector: React.FC<TrainSelectorProps> = ({
  trains,
  selectedTrain,
  onSelectTrain,
  searchQuery,
  setSearchQuery,
  isLoading,
}) => {
  const filtered = trains.filter(t =>
    t.train_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.train_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-6 flex-shrink-0">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by train number or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Selected Train Tag */}
        {selectedTrain && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-sm self-start">
            <Train className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{selectedTrain.train_number}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground truncate max-w-[120px]">{selectedTrain.train_name}</span>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {searchQuery.trim() && (
        <div className="mt-3 border border-border rounded-lg overflow-hidden bg-background divide-y divide-border max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Loading trains...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No trains found</div>
          ) : (
            filtered.slice(0, 8).map((train) => (
              <button
                key={train.train_number}
                onClick={() => { onSelectTrain(train); setSearchQuery(''); }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted transition-colors ${selectedTrain?.train_number === train.train_number ? 'bg-primary/5' : ''}`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{train.train_number}</span>
                  <span className="text-xs text-muted-foreground">{train.train_name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{train.current_station?.code} → {train.next_station?.code}</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                    train.status === 'CRITICAL' ? 'bg-destructive/10 text-destructive' :
                    train.delay_minutes > 0 ? 'bg-warning/10 text-warning' :
                    'bg-success/10 text-success'
                  }`}>
                    {train.status === 'CRITICAL' ? 'Critical' : train.delay_minutes > 0 ? `+${train.delay_minutes}m` : 'On Time'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
