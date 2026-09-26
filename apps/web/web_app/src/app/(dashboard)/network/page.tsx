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
import { NetworkHealthHero }         from '@/components/network-intel/NetworkHealthHero';
import { NetworkKPIRow }             from '@/components/network-intel/NetworkKPIRow';
import { SectionIntelligence }       from '@/components/network-intel/SectionIntelligence';
import { BottleneckPanel }           from '@/components/network-intel/BottleneckPanel';
import { AffectedTrains }            from '@/components/network-intel/AffectedTrains';
import { DelayPropagation }          from '@/components/network-intel/DelayPropagation';
import { OperationalImpact }         from '@/components/network-intel/OperationalImpact';
import { OperatorAlertQueue }        from '@/components/network-intel/OperatorAlertQueue';
import { TopWarnings }               from '@/components/network-intel/TopWarnings';
import { MapWrapper }                from '@/components/network/MapWrapper';
import { SimMapWrapper }             from '@/components/network/SimMapWrapper';
import { SimControlPanel }           from '@/components/network/SimControlPanel';
import { useSimulation }             from '@/hooks/useSimulation';
import { RefreshCw, Map, List, Radio, Cpu } from 'lucide-react';

type DataFreshness = 'live' | 'stale' | 'unavailable';
type NetworkMode   = 'live' | 'simulation';
type SubView       = 'map' | 'list';

export default function NetworkIntelligencePage() {
  // ─── Mode ────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<NetworkMode>('live');

  // ─── LIVE data state ─────────────────────────────────────────────────────
  const [trains,      setTrains]      = useState<TrainStatus[]>([]);
  const [zones,       setZones]       = useState<NetworkZoneStatus[]>([]);
  const [segments,    setSegments]    = useState<RouteCongestionSegment[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckResponse[]>([]);
  const [propagation, setPropagation] = useState<PropagationResponse | null>(null);
  const [alerts,      setAlerts]      = useState<any[]>([]);
  const [warnings,    setWarnings]    = useState<any[]>([]);

  const [isLoadingTrains,      setIsLoadingTrains]      = useState(true);
  const [isLoadingZones,       setIsLoadingZones]       = useState(true);
  const [isLoadingSegments,    setIsLoadingSegments]    = useState(true);
  const [isLoadingBottlenecks, setIsLoadingBottlenecks] = useState(true);
  const [isLoadingAlerts,      setIsLoadingAlerts]      = useState(true);
  const [bottlenecksUnavailable, setBottlenecksUnavailable] = useState(false);
  const [propagationUnavailable, setPropagationUnavailable] = useState(false);

  const [selectedTrain, setSelectedTrain] = useState<TrainStatus | null>(null);
  const [filterStatus,  setFilterStatus]  = useState('ALL');
  const [view,          setView]          = useState<SubView>('list');
  const [isRefreshing,  setIsRefreshing]  = useState(false);
  const [updatedAt,     setUpdatedAt]     = useState('');
  const [dataFreshness, setDataFreshness] = useState<DataFreshness>('live');

  // ─── SIMULATION engine ──────────────────────────────────────────────────
  const sim = useSimulation();
  const [simSelectedId, setSimSelectedId] = useState<string | null>(null);

  // ─── LIVE fetch ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    const now = new Date();

    RailwayApiService.searchTrains()
      .then((data) => { setTrains(data); setIsLoadingTrains(false); })
      .catch(() => setIsLoadingTrains(false));

    RailwayApiService.getNetworkStatus()
      .then((data) => { setZones(data); setIsLoadingZones(false); })
      .catch(() => setIsLoadingZones(false));

    RailwayApiService.getRouteCongestion()
      .then((data) => { setSegments(data); setIsLoadingSegments(false); })
      .catch(() => setIsLoadingSegments(false));

    RailwayApiService.getBottlenecks()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.bottlenecks ?? [];
        setBottlenecks(list);
        setBottlenecksUnavailable(false);
        setIsLoadingBottlenecks(false);
      })
      .catch(() => { setBottlenecksUnavailable(true); setIsLoadingBottlenecks(false); });

    RailwayApiService.getAlerts()
      .then((data) => { setAlerts(data); setIsLoadingAlerts(false); })
      .catch(() => setIsLoadingAlerts(false));

    RailwayApiService.getWarnings()
      .then((data) => setWarnings(data))
      .catch(console.error);

    setUpdatedAt(now.toLocaleTimeString('en-US', { hour12: false }));
    setDataFreshness('live');
    if (isManual) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(), 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    const firstDelayed = trains.find((t) => t.delay_minutes > 0);
    if (!firstDelayed) return;
    RailwayApiService.getPropagation(firstDelayed.train_number)
      .then((data) => { setPropagation(data); setPropagationUnavailable(false); })
      .catch(() => setPropagationUnavailable(true));
  }, [trains]);

  const isLoading = isLoadingTrains && isLoadingZones;

  // ─── Mode switch handler — pause sim when leaving sim mode ────────────────
  const handleModeChange = (m: NetworkMode) => {
    if (m === 'live' && sim.running) sim.pause();
    setMode(m);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <NetworkIntelligenceHeader updatedAt={updatedAt} dataFreshness={dataFreshness} />

      {/* ── MODE SWITCH ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mr-1">Mode</span>

        {/* LIVE toggle */}
        <button
          onClick={() => handleModeChange('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === 'live'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${mode === 'live' ? 'animate-pulse' : ''}`} />
          LIVE
        </button>

        {/* SIMULATION toggle */}
        <button
          onClick={() => handleModeChange('simulation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === 'simulation'
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-500 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          SIMULATION
        </button>

        {/* Source tag */}
        <div className="ml-auto text-[11px] text-muted-foreground/60 hidden sm:block">
          {mode === 'live'
            ? 'Data source: RailRadar via Render backend'
            : 'Data source: deterministic simulation engine · not RailRadar'}
        </div>
      </div>

      {/* ── SIMULATION MODE ─────────────────────────────────────────────── */}
      {mode === 'simulation' && (
        <div className="space-y-4">
          {/* Control Panel */}
          <SimControlPanel
            running={sim.running}
            speed={sim.speed}
            state={sim.state}
            metrics={sim.metrics}
            onStart={sim.start}
            onPause={sim.pause}
            onReset={sim.reset}
            onTriggerBottleneck={sim.triggerBottleneck}
            onRunMitigation={sim.runMitigation}
            onSetSpeed={sim.setSpeed}
          />

          {/* Simulation Map */}
          <div className="h-[520px] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <SimMapWrapper
              trains={sim.trains}
              segments={sim.segments}
              selectedId={simSelectedId}
              onSelect={setSimSelectedId}
            />
          </div>
        </div>
      )}

      {/* ── LIVE MODE ───────────────────────────────────────────────────── */}
      {mode === 'live' && (
        <>
          <NetworkHealthHero zones={zones} isLoading={isLoadingZones} />
          <NetworkKPIRow trains={trains} zones={zones} segments={segments} isLoading={isLoading} />

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

          {/* Live Map */}
          {view === 'map' && (
            <div className="h-[500px] bg-card border border-border rounded-xl overflow-hidden shadow-sm relative">
              <MapWrapper
                trains={trains}
                onSelectTrain={(t) => { setSelectedTrain(t); setView('list'); }}
                selectedTrainId={selectedTrain?.train_number || null}
              />
              {/* LIVE badge */}
              <div className="absolute top-3 left-3 z-[500] flex items-center gap-1.5 bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse inline-block" />
                LIVE · RailRadar
              </div>
            </div>
          )}

          {/* Intelligence List View */}
          {view === 'list' && (
            <>
              <SectionIntelligence
                zones={zones}
                segments={segments}
                isLoading={isLoadingZones || isLoadingSegments}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BottleneckPanel bottlenecks={bottlenecks} isLoading={isLoadingBottlenecks} isUnavailable={bottlenecksUnavailable} />
                <AffectedTrains trains={trains} isLoading={isLoadingTrains} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DelayPropagation propagation={propagation} isLoading={isLoadingTrains && !propagationUnavailable} isUnavailable={propagationUnavailable} />
                <OperationalImpact trains={trains} zones={zones} isLoading={isLoading} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <OperatorAlertQueue alerts={alerts} isLoading={isLoadingAlerts} />
                <TopWarnings warnings={warnings} isLoading={isLoadingAlerts} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
