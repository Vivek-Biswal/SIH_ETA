import React from 'react';
import { History, Clock } from 'lucide-react';

interface RecentActivityProps {
  activities: Array<{
    train_no: string;
    name: string;
    origin: string;
    destination: string;
    time: string;
  }>;
  isLoading: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center space-x-3">
        <History className="w-5 h-5 text-gray-400" />
        <h3 className="text-white font-semibold text-lg">Recent Searches</h3>
      </div>
      
      <div className="p-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-[#1F2937] rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-gray-500">
            <Clock className="w-10 h-10 mb-3 opacity-20" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {activities.map((activity, i) => (
              <div key={i} className="px-5 py-4 hover:bg-[#1F2937]/50 transition-colors cursor-pointer flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-medium">{activity.train_no}</span>
                    <span className="text-white font-medium">{activity.name}</span>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    {activity.origin} <span className="text-gray-600 mx-1">→</span> {activity.destination}
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
