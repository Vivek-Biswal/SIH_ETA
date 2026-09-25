'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RailwayApiService } from '@/services/api';
import {
  TrainStatus,
  NetworkZoneStatus,
  RouteCongestionSegment,
  BottleneckResponse,
  PropagationResponse,
} from '@/types/api';

import { NetworkIntelligenceHeader } from '@/components/network-intel/NetworkIntelligenceHeader';
import { NetworkHealthHero } from '@/components/network-intel/NetworkHealthHero';
import { NetworkKPIRow } from '@/components/network-intel/NetworkKPIRow';
import { SectionIntelligence } from '@/components/network-intel/SectionIntelligence';
import { BottleneckPanel } from '@/components/network-intel/BottleneckPanel';
import { AffectedTrains } from '@/components/network-intel/AffectedTrains';
import { DelayPropagation } from '@/components/network-intel/DelayPropagation';
import { OperationalImpact } from '@/components/network-intel/OperationalImpact';
import { OperatorAlertQueue } from '@/components/network-intel/OperatorAlertQueue';
import { TopWarnings } from '@/components/network-intel/TopWarnings';
import { MapWrapper } from '@/components/network/MapWrapper';
import { RefreshCw, Map, List } from 'lucide-react';

type DataFreshness = 'live' | 'stale' | 'unavailable';

export default function NetworkIntelligencePage() {
  // Data state
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [zones, setZones] = useState<NetworkZoneStatus[]>([]);
  const [segments, setSegments] = useState<RouteCongestionSegment[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckResponse[]>([]);
  const [propagation, setPropagation] = useState<PropagationResponse | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);

  // Loading states per section — individual failures don't break the whole page
  const [isLoadingTrains, setIsLoadingTrains] = useState(true);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  const [isLoadingBottlenecks, setIsLoadingBottlenecks] = useState(true);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  const [bottlenecksUnavailable, setBottlenecksUnavailable] = useState(false);
  const [propagationUnavailable, setPropagationUnavailable] = useState(false);

  // UI state
  const [selectedTrain, setSelectedTrain] = useState<TrainStatus | null>(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [view, setView] = useState<'map' | 'list'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [dataFreshness, setDataFreshness] = useState<DataFreshness>('live');

  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    const now = new Date();

    // Fetch trains
    RailwayApiService.searchTrains()
      .then((data) => { setTrains(data); setIsLoadingTrains(false); })
      .catch(() => setIsLoadingTrains(false));

    // Fetch zones
    RailwayApiService.getNetworkStatus()
      .then((data) => { setZones(data); setIsLoadingZones(false); })
      .catch(() => setIsLoadingZones(false));

    // Fetch route congestion segments
    RailwayApiService.getRouteCongestion()
      .then((data) => { setSegments(data); setIsLoadingSegments(false); })
      .catch(() => setIsLoadingSegments(false));

    // Fetch bottlenecks (may not be available)
    RailwayApiService.getBottlenecks()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.bottlenecks ?? [];
        setBottlenecks(list);
        setBottlenecksUnavailable(false);
        setIsLoadingBottlenecks(false);
      })
      .catch(() => {
        setBottlenecksUnavailable(true);
        setIsLoadingBottlenecks(false);
      });

    // Fetch Alerts & Warnings
    RailwayApiService.getAlerts()
      .then((data) => { setAlerts(data); setIsLoadingAlerts(false); })
      .catch(() => setIsLoadingAlerts(false));
      
    RailwayApiService.getWarnings()
      .then((data) => setWarnings(data))
      .catch(console.error);

    // Fetch propagation for first delayed train (may not be available)
    // We defer this until after trains load — use a best-effort fetch
    setUpdatedAt(now.toLocaleTimeString('en-US', { hour12: false }));
    setDataFreshness('live');
    if (isManual) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(), 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Once trains load, try to fetch propagation for first affected train
  useEffect(() => {
    const firstDelayed = trains.find(t => t.delay_minutes > 0);
    if (!firstDelayed) return;

    RailwayApiService.getPropagation(firstDelayed.train_number)
      .then((data) => { setPropagation(data); setPropagationUnavailable(false); })
      .catch(() => setPropagationUnavailable(true));
  }, [trains]);

  const isLoading = isLoadingTrains && isLoadingZones;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <NetworkIntelligenceHeader updatedAt={updatedAt} dataFreshness={dataFreshness} />

      {/* Network Health Hero */}
      <NetworkHealthHero zones={zones} isLoading={isLoadingZones} />

      {/* KPI Row */}
      <NetworkKPIRow
        trains={trains}
        zones={zones}
        segments={segments}
        isLoading={isLoading}
      />

      {/* View Toggle + Refresh */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="w-3.5 h-3.5" />
            Intelligence
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'map' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Map className="w-3.5 h-3.5" />
            Network Map
          </button>
        </div>

        <button
          onClick={() => fetchAll(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg px-3 py-1.5 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Map View */}
      {view === 'map' && (
        <div className="h-[500px] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <MapWrapper
            trains={trains}
            onSelectTrain={(t) => {
              setSelectedTrain(t);
              setView('list');
            }}
            selectedTrainId={selectedTrain?.train_number || null}
          />
        </div>
      )}

      {/* Intelligence List View */}
      {view === 'list' && (
        <>
          {/* Section Intelligence */}
          <SectionIntelligence
            zones={zones}
            segments={segments}
            isLoading={isLoadingZones || isLoadingSegments}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
          />

          {/* Bottlenecks + Affected Trains */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BottleneckPanel
              bottlenecks={bottlenecks}
              isLoading={isLoadingBottlenecks}
              isUnavailable={bottlenecksUnavailable}
            />
            <AffectedTrains
              trains={trains}
              isLoading={isLoadingTrains}
            />
          </div>

          {/* Delay Propagation + Operational Impact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DelayPropagation
              propagation={propagation}
              isLoading={isLoadingTrains && !propagationUnavailable}
              isUnavailable={propagationUnavailable}
            />
            <OperationalImpact
              trains={trains}
              zones={zones}
              isLoading={isLoading}
            />
          </div>

          {/* Alerts & Warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <OperatorAlertQueue
              alerts={alerts}
              isLoading={isLoadingAlerts}
            />
            <TopWarnings
              warnings={warnings}
              isLoading={isLoadingAlerts}
            />
          </div>
        </>
      )}
    </div>
  );
}
