'use client';

import React, { useEffect, useState } from 'react';
import { RailwayApiService } from '@/services/api';
import { TrainStatus } from '@/types/api';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { NetworkHealth } from '@/components/dashboard/NetworkHealth';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { LiveNetworkOverview } from '@/components/dashboard/LiveNetworkOverview';
import { TrainOperations } from '@/components/dashboard/TrainOperations';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';
import { NetworkPerformance } from '@/components/dashboard/NetworkPerformance';

export default function DashboardPage() {
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    RailwayApiService.searchTrains()
      .then((data) => {
        setTrains(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Unable to load network data. Please try again.");
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <DashboardHeader />
      
      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-background border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <KPIGrid trains={trains} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveNetworkOverview />
            </div>
            <div className="lg:col-span-1">
              <NetworkHealth />
            </div>
          </div>
          
          <div className="w-full">
            <TrainOperations trains={trains} isLoading={isLoading} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentAlerts />
            <NetworkPerformance trains={trains} isLoading={isLoading} />
          </div>
        </>
      )}
    </div>
  );
}
