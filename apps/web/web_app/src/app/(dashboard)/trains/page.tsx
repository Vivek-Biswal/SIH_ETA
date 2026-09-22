'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { RailwayApiService } from '@/services/api';
import { TrainStatus, ETAResponse } from '@/types/api';

import { ETAPageHeader } from '@/components/eta/ETAPageHeader';
import { TrainSelector } from '@/components/eta/TrainSelector';
import { TrainOverviewCard } from '@/components/eta/TrainOverviewCard';
import { ETAPredictionCard } from '@/components/eta/ETAPredictionCard';
import { JourneyTimeline } from '@/components/eta/JourneyTimeline';
import { PredictionFactors } from '@/components/eta/PredictionFactors';
import { OperationalStatus } from '@/components/eta/OperationalStatus';
import { Search } from 'lucide-react';

// Skeleton loader for loading states
const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-card border border-border rounded-xl p-6 animate-pulse shadow-sm ${className}`}>
    <div className="h-4 bg-muted rounded w-1/3 mb-4" />
    <div className="h-10 bg-muted rounded w-1/2 mb-3" />
    <div className="h-3 bg-muted rounded w-full mb-2" />
    <div className="h-3 bg-muted rounded w-2/3" />
  </div>
);

type DataFreshness = 'live' | 'stale' | 'unavailable';

export default function ETAIntelligencePage() {
  // All trains list (for the search/selector)
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected train state
  const [selectedTrain, setSelectedTrain] = useState<TrainStatus | null>(null);
  const [selectedETA, setSelectedETA] = useState<ETAResponse | null>(null);

  // Async ETA loading
  const [isLoadingETA, setIsLoadingETA] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);

  // Data freshness
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [dataFreshness, setDataFreshness] = useState<DataFreshness>('live');
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Load train list
  useEffect(() => {
    RailwayApiService.searchTrains()
      .then((data) => {
        setTrains(data);
        setIsLoadingList(false);
      })
      .catch(() => {
        setIsLoadingList(false);
      });
  }, []);

  // Update data freshness every 15 seconds
  useEffect(() => {
    if (!lastFetchTime) return;
    const interval = setInterval(() => {
      const ageMs = Date.now() - lastFetchTime;
      if (ageMs > 120_000) setDataFreshness('stale');
      else setDataFreshness('live');
    }, 15_000);
    return () => clearInterval(interval);
  }, [lastFetchTime]);

  // When a train is selected, fetch its ETA
  const handleSelectTrain = useCallback(async (train: TrainStatus) => {
    setSelectedTrain(train);
    setSelectedETA(null);
    setEtaError(null);
    setIsLoadingETA(true);

    try {
      const eta = await RailwayApiService.getTrainETA(train.train_number);
      setSelectedETA(eta);
      const now = new Date();
      setUpdatedAt(now.toLocaleTimeString('en-US', { hour12: false }));
      setLastFetchTime(now.getTime());
      setDataFreshness('live');
    } catch {
      setEtaError('ETA prediction could not be loaded. Please try again.');
      setDataFreshness('unavailable');
    } finally {
      setIsLoadingETA(false);
    }
  }, []);

  return (
    <div className="space-y-0 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <ETAPageHeader
        selectedTrain={selectedTrain}
        updatedAt={updatedAt}
        dataFreshness={dataFreshness}
      />

      {/* Train Selector */}
      <TrainSelector
        trains={trains}
        selectedTrain={selectedTrain}
        onSelectTrain={handleSelectTrain}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoadingList}
      />

      {/* Empty State */}
      {!selectedTrain && (
        <div className="bg-card border border-border rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Select a Train</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Search for a train number or train name above to view its ETA intelligence, journey timeline, and prediction factors.
          </p>
        </div>
      )}

      {/* ETA Error State */}
      {selectedTrain && etaError && (
        <div className="space-y-6">
          {/* Show train overview even when ETA fails */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrainOverviewCard train={selectedTrain} eta={null} />
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
              <h3 className="text-base font-semibold text-foreground mb-2">ETA Prediction Unavailable</h3>
              <p className="text-sm text-muted-foreground mb-4">{etaError}</p>
              {selectedTrain.predicted_next_arrival && (
                <div className="text-xs text-muted-foreground">
                  Scheduled arrival: <span className="font-semibold text-foreground">{selectedTrain.predicted_next_arrival}</span>
                </div>
              )}
              <button
                onClick={() => handleSelectTrain(selectedTrain)}
                className="mt-4 px-4 py-2 bg-background border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading ETA State */}
      {selectedTrain && isLoadingETA && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {/* Full Intelligence View */}
      {selectedTrain && selectedETA && !isLoadingETA && !etaError && (
        <div className="space-y-6">
          {/* Row 1: Train Overview + ETA Prediction */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrainOverviewCard train={selectedTrain} eta={selectedETA} />
            <ETAPredictionCard train={selectedTrain} eta={selectedETA} />
          </div>

          {/* Row 2: Journey Timeline (full width) */}
          <JourneyTimeline train={selectedTrain} eta={selectedETA} />

          {/* Row 3: Prediction Factors + Operational Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PredictionFactors eta={selectedETA} />
            <OperationalStatus train={selectedTrain} eta={selectedETA} />
          </div>
        </div>
      )}
    </div>
  );
}
