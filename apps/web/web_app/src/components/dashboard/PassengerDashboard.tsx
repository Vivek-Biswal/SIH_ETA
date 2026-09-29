'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedSearch, type SearchResult } from './UnifiedSearch';
import { CompactTrainCard } from './CompactTrainCard';
import { QuickActions } from './QuickActions';
import { RecentSearches, saveRecentSearch } from './RecentSearches';
import { LiveSnapshot } from './LiveSnapshot';
import { Sparkles } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto pb-12 pt-6 sm:pt-10 px-4 space-y-10">
      {/* Hero Section */}
      <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-bold">
            Etaernal Intelligence
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

      {!selectedTrain && <section className="animate-in fade-in duration-700 delay-150 fill-mode-both">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <div className="rounded-[1.6rem] border border-border/80 bg-card/80 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Your next move</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Choose how to explore</h2><p className="mt-1 text-sm text-muted-foreground">Start with a train, a station, or the network around you.</p></div>
              <span className="hidden rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">Live tools</span>
            </div>
            <QuickActions />
            <div className="mt-5 flex items-start gap-3 border-t border-border/70 pt-4"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Sparkles size={15} /></span><div><p className="text-sm font-semibold text-foreground">Fastest lookup</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Enter a 5-digit train number such as <span className="font-mono font-semibold text-foreground">12423</span>, or search by the train name.</p></div></div>
            <div className="mt-5"><RecentSearches onSelect={handleSearchSelect} /></div>
          </div>
          <LiveSnapshot />
        </div>
      </section>}
    </div>
  );
}
