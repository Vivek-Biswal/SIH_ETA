import React from 'react';
import { Activity, Route, Clock, Search } from 'lucide-react';

interface StatsProps {
  stats: {
    active_trains: number;
    active_routes: number;
    avg_delay_mins: number;
    total_searches: number;
  };
  isLoading: boolean;
}

export function DashboardStats({ stats, isLoading }: StatsProps) {
  const cards = [
    { title: 'Active Trains', value: stats.active_trains, icon: Activity, color: 'text-blue-500' },
    { title: 'Routes Monitored', value: stats.active_routes, icon: Route, color: 'text-purple-500' },
    { title: 'Avg Delay', value: `${stats.avg_delay_mins}m`, icon: Clock, color: 'text-orange-500' },
    { title: 'Searches Today', value: stats.total_searches, icon: Search, color: 'text-green-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex items-center space-x-4 shadow-md">
          <div className={`p-3 rounded-lg bg-[#1F2937] border border-gray-700 ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">{card.title}</p>
            {isLoading ? (
              <div className="h-6 w-16 bg-gray-800 rounded animate-pulse mt-1"></div>
            ) : (
              <p className="text-white text-2xl font-bold">{card.value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
