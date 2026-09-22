'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { RailwayApiService } from '@/services/api';

interface Alert {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  location: string;
  impact: string;
  time: string;
}

export const RecentAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      RailwayApiService.searchTrains().catch(() => []),
      RailwayApiService.getBottlenecks().catch(() => ({ bottlenecks: [] }))
    ]).then(([trains, bottleneckData]) => {
      const list: Alert[] = [];
      const bottlenecks = Array.isArray(bottleneckData) ? bottleneckData : bottleneckData?.bottlenecks ?? [];
      
      bottlenecks.slice(0, 2).forEach((b: any, i: number) => {
        list.push({
          id: `bn-${i}`,
          type: b.risk === 'critical' ? 'CRITICAL' : 'WARNING',
          title: `Network Bottleneck`,
          location: b.location,
          impact: `${b.affected_trains} trains affected`,
          time: 'Live'
        });
      });

      trains.filter(t => t.status === 'CRITICAL' || t.delay_minutes > 45).slice(0, 3 - list.length).forEach((t) => {
        list.push({
          id: `tr-${t.train_number}`,
          type: 'CRITICAL',
          title: `Train Disruption: ${t.train_number}`,
          location: t.current_station?.code || 'Unknown',
          impact: `+${t.delay_minutes} min delay`,
          time: 'Live'
        });
      });

      if (list.length === 0) {
        list.push({
          id: 'info-1',
          type: 'INFO',
          title: 'Network operations normal',
          location: 'All zones',
          impact: 'No major disruptions detected',
          time: 'Live'
        });
      }

      setAlerts(list);
      setIsLoading(false);
    });
  }, []);

  const getIcon = (type: string) => {
    switch(type) {
      case 'CRITICAL': return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'INFO': return <Info className="w-5 h-5 text-info" />;
      default: return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm transition-colors flex flex-col h-full">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Alerts</h2>
        <Link href="/alerts" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          View All
        </Link>
      </div>
      
      <div className="p-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-4 space-y-3">
               <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
               <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          ) : alerts.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">{alert.title}</h3>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{alert.time}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">{alert.location}</div>
                  <div className={`text-xs font-medium ${alert.type === 'CRITICAL' ? 'text-destructive' : alert.type === 'WARNING' ? 'text-warning' : 'text-info'}`}>
                    {alert.impact}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
