'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RailwayApiService } from '@/services/api';
import { TrainStatus, NetworkZoneStatus } from '@/types/api';

import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsKpiRow } from '@/components/analytics/AnalyticsKpiRow';
import { DelayTrendChart } from '@/components/analytics/DelayTrendChart';
import { OnTimePerformanceChart } from '@/components/analytics/OnTimePerformanceChart';
import { EtaAccuracyPanel } from '@/components/analytics/EtaAccuracyPanel';
import { TrainPerformanceTable } from '@/components/analytics/TrainPerformanceTable';
import { NetworkSectionPerformance } from '@/components/analytics/NetworkSectionPerformance';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('Current Snapshot');
  
  // Data state
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [zones, setZones] = useState<NetworkZoneStatus[]>([]);
  
  // Loading states
  const [isLoadingTrains, setIsLoadingTrains] = useState(true);
  const [isLoadingZones, setIsLoadingZones] = useState(true);

  const fetchSnapshotData = useCallback(async () => {
    // Analytics is not real-time dashboard, so we fetch once per mount/refresh
    RailwayApiService.searchTrains()
      .then((data) => { setTrains(data); setIsLoadingTrains(false); })
      .catch(() => setIsLoadingTrains(false));

    RailwayApiService.getNetworkStatus()
      .then((data) => { setZones(data); setIsLoadingZones(false); })
      .catch(() => setIsLoadingZones(false));
  }, []);

  useEffect(() => {
    fetchSnapshotData();
  }, [fetchSnapshotData]);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      <AnalyticsHeader timeRange={timeRange} setTimeRange={setTimeRange} />

      {/* KPI Row */}
      <AnalyticsKpiRow trains={trains} isLoading={isLoadingTrains} />

      {/* Charts Grid 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DelayTrendChart />
        <OnTimePerformanceChart trains={trains} isLoading={isLoadingTrains} />
      </div>

      {/* Accuracy Panel */}
      <div className="grid grid-cols-1 gap-6">
        <EtaAccuracyPanel />
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrainPerformanceTable trains={trains} isLoading={isLoadingTrains} />
        <NetworkSectionPerformance zones={zones} isLoading={isLoadingZones} />
      </div>
    </div>
  );
}
