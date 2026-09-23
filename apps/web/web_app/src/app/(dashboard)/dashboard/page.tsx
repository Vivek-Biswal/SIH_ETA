'use client';

import React, { useEffect, useState } from 'react';
import { RailwayApiService } from '@/services/api';

import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { FindTrainsCard } from '@/components/dashboard/FindTrainsCard';
import { LiveStatusCard } from '@/components/dashboard/LiveStatusCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { RailRadarCard, MultiCityCard } from '@/components/dashboard/ActionCards';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    active_trains: 0,
    active_routes: 0,
    avg_delay_mins: 0,
    total_searches: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    RailwayApiService.getDashboardStats()
      .then((data) => {
        setStats(data);
        setIsLoadingStats(false);
      })
      .catch(() => {
        // Fallback gracefully in UI
        setIsLoadingStats(false);
      });

    RailwayApiService.getRecentActivity()
      .then((data) => {
        setRecentActivities(data);
        setIsLoadingRecent(false);
      })
      .catch(() => {
        setIsLoadingRecent(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 pt-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here is what's happening on the network today.</p>
      </div>

      {/* Stats row */}
      <DashboardStats stats={stats} isLoading={isLoadingStats} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        
        {/* Main Action Column */}
        <div className="lg:col-span-7 space-y-4">
          <RailRadarCard />
          <FindTrainsCard />
          <MultiCityCard />
          <LiveStatusCard />
        </div>

        {/* Sidebar / Secondary Column */}
        <div className="lg:col-span-5">
          <RecentActivity activities={recentActivities} isLoading={isLoadingRecent} />
        </div>
        
      </div>
    </div>
  );
}
