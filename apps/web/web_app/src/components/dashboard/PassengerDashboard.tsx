'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedSearch, type SearchResult } from './UnifiedSearch';
import { CompactTrainCard } from './CompactTrainCard';
import { QuickActions } from './QuickActions';
import { RecentSearches, saveRecentSearch } from './RecentSearches';
import { LiveSnapshot } from './LiveSnapshot';

export function PassengerDashboard() {
  const router = useRouter();
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);

  const handleSearchSelect = (result: SearchResult) => {
    saveRecentSearch(result);
    
    if (result.type === 'train') {
      setSelectedTrain(result.id);
    } else if (result.type === 'station') {
      router.push(`/stations/${result.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 pt-6 sm:pt-10 px-4 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-bold">
            SIH ETA Intelligence
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            Where is your train going?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Instantly track trains, explore stations, and monitor live railway intelligence.
          </p>
        </div>

        <div className="relative z-20">
          <UnifiedSearch onSelect={handleSearchSelect} />
        </div>
      </section>

      {/* Selected Train Result */}
      {selectedTrain && (
        <section className="animate-in fade-in zoom-in-95 duration-300">
          <CompactTrainCard 
            number={selectedTrain} 
            onClose={() => setSelectedTrain(null)} 
          />
        </section>
      )}

      {!selectedTrain && (
        <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start animate-in fade-in duration-700 delay-150 fill-mode-both">
          {/* Main Column */}
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h2>
              <QuickActions />
            </section>
            
            <section>
              <RecentSearches onSelect={handleSearchSelect} />
            </section>
          </div>

          {/* Sidebar / Snapshot */}
          <div className="space-y-8">
            <LiveSnapshot />
            
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
              <h3 className="font-semibold text-primary mb-2">Pro Tip</h3>
              <p className="text-sm text-muted-foreground">
                You can search by 5-digit train number (e.g., 12423) for the fastest results, or just type the train name.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
