'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { RailwayApiService } from '@/services/api';
import { TrainStatus, Station } from '@/types/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Search, MapPin, Activity, Clock, ArrowRight, TrainFront, LayoutDashboard, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function StationsPage() {
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);

  useEffect(() => {
    RailwayApiService.searchTrains()
      .then(data => {
        setTrains(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Derive unique stations from current and next stations of active trains
  const stations = useMemo(() => {
    const stationMap = new Map<string, Station>();
    trains.forEach(t => {
      if (t.current_station) stationMap.set(t.current_station.code, t.current_station);
      if (t.next_station) stationMap.set(t.next_station.code, t.next_station);
    });
    return Array.from(stationMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [trains]);

  const filteredStations = stations.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStation = stations.find(s => s.code === selectedStationCode) || null;

  // Station specific intelligence
  const stationIntelligence = useMemo(() => {
    if (!selectedStation) return null;
    
    // Trains where this is the next station (Arrivals) or current station (Departures/At Platform)
    // Note: Since we only have a snapshot of current trains, we'll approximate arrivals and departures
    const incomingTrains = trains.filter(t => t.next_station?.code === selectedStation.code);
    const atStationTrains = trains.filter(t => t.current_station?.code === selectedStation.code);
    
    const activeTrains = [...incomingTrains, ...atStationTrains];
    const delayedTrains = activeTrains.filter(t => t.delay_minutes > 0);
    const avgDelay = activeTrains.length > 0 
      ? Math.round(activeTrains.reduce((sum, t) => sum + t.delay_minutes, 0) / activeTrains.length) 
      : 0;

    let status: 'NORMAL' | 'MINOR DISRUPTION' | 'HIGH CONGESTION' | 'CRITICAL' = 'NORMAL';
    const delayRatio = activeTrains.length > 0 ? delayedTrains.length / activeTrains.length : 0;
    
    if (activeTrains.some(t => t.status === 'CRITICAL')) status = 'CRITICAL';
    else if (delayRatio > 0.5 || activeTrains.length > 10) status = 'HIGH CONGESTION';
    else if (delayRatio > 0.2) status = 'MINOR DISRUPTION';

    return {
      incomingTrains,
      atStationTrains,
      activeTrains,
      delayedTrains,
      avgDelay,
      status
    };
  }, [selectedStation, trains]);

  return (
    <div className="max-w-7xl mx-auto pb-12 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Station Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time operational visibility into railway stations
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Column: Station Directory & Search */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col bg-card border border-border rounded-xl shadow-sm min-h-0">
          <div className="p-4 border-b border-border space-y-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search stations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredStations.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No stations found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredStations.map(station => {
                  const isSelected = selectedStationCode === station.code;
                  return (
                    <div 
                      key={station.code}
                      onClick={() => setSelectedStationCode(station.code)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected 
                          ? 'bg-muted border-primary shadow-sm' 
                          : 'bg-transparent border-transparent hover:bg-muted/40'
                      } border`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{station.name}</div>
                        <div className="text-xs font-mono text-muted-foreground mt-0.5">{station.code}</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Station Overview */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedStation || !stationIntelligence ? (
            <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Select a Station</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a station from the directory to view its operational intelligence, live trains, and active delays.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-6">
              
              {/* Station Header & KPIs */}
              <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex-shrink-0">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold text-foreground">{selectedStation.name}</h2>
                      <span className="text-sm font-mono font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border/50">
                        {selectedStation.code}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Railway Station Operations</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Station Status</span>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-md border ${
                        stationIntelligence.status === 'CRITICAL' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        stationIntelligence.status === 'HIGH CONGESTION' ? 'bg-warning/10 text-warning border-warning/20' :
                        stationIntelligence.status === 'MINOR DISRUPTION' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-success/10 text-success border-success/20'
                      }`}>
                        {stationIntelligence.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Active Trains
                    </div>
                    <div className="text-2xl font-bold">{stationIntelligence.activeTrains.length}</div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" /> Incoming
                    </div>
                    <div className="text-2xl font-bold">{stationIntelligence.incomingTrains.length}</div>
                  </div>
                  <div className="bg-warning/5 p-4 rounded-xl border border-warning/10">
                    <div className="text-xs font-medium text-warning mb-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Delayed
                    </div>
                    <div className="text-2xl font-bold text-warning">{stationIntelligence.delayedTrains.length}</div>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Avg Delay
                    </div>
                    <div className={`text-2xl font-bold tabular-nums ${stationIntelligence.avgDelay > 0 ? 'text-warning' : 'text-success'}`}>
                      {stationIntelligence.avgDelay > 0 ? `+${stationIntelligence.avgDelay}m` : '0m'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid for Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                
                {/* Active Trains Table (Arrivals & Departures) */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm flex flex-col min-h-0">
                  <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <TrainFront className="w-4 h-4" /> Live Traffic
                    </h3>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-card z-10">
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Train</th>
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Relation</th>
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Delay</th>
                          <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stationIntelligence.activeTrains.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                              No live trains recorded at this station in current snapshot.
                            </td>
                          </tr>
                        ) : (
                          stationIntelligence.activeTrains.map(train => (
                            <tr key={train.train_number} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <Link href={`/trains/${train.train_number}`} className="flex flex-col group block">
                                  <span className="font-semibold text-sm text-foreground font-mono group-hover:text-primary transition-colors">{train.train_number}</span>
                                  <span className="text-xs text-muted-foreground">{train.train_name}</span>
                                </Link>
                              </td>
                              <td className="px-4 py-3">
                                {train.next_station?.code === selectedStation.code ? (
                                  <span className="text-xs font-medium text-info bg-info/10 px-2 py-0.5 rounded border border-info/20">Arriving from {train.current_station?.code}</span>
                                ) : (
                                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50">At Station / Departing</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-sm font-bold tabular-nums ${
                                  train.delay_minutes > 15 ? 'text-destructive' : 
                                  train.delay_minutes > 0 ? 'text-warning' : 
                                  'text-success'
                                }`}>
                                  {train.delay_minutes > 0 ? `+${train.delay_minutes}m` : 'On Time'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end">
                                  <StatusBadge type={train.status === 'DELAYED' ? 'WARNING' : train.status as any} label={train.status === 'DELAYED' ? 'Delayed' : undefined} />
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Intelligence */}
                <div className="flex flex-col gap-6 min-h-0">
                  
                  {/* Platform Intelligence */}
                  <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col p-5">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                      <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Platform Utilization
                    </h3>
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                      <div className="text-sm font-medium text-foreground mb-1">Data Unavailable</div>
                      <p className="text-xs text-muted-foreground">
                        Live platform occupancy metrics are not provided in the current operational feed.
                      </p>
                    </div>
                  </div>

                  {/* Station Alerts */}
                  <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col p-5 flex-1 min-h-0 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" /> Station Alerts
                    </h3>
                    <div className="space-y-3">
                      {stationIntelligence.delayedTrains.length > 0 ? (
                        <>
                          {stationIntelligence.delayedTrains.slice(0, 3).map(t => (
                            <div key={t.train_number} className="bg-warning/5 border border-warning/10 rounded-lg p-3">
                              <div className="text-xs font-semibold text-warning mb-0.5">Service Delay</div>
                              <div className="text-xs text-muted-foreground">{t.train_number} is delayed by {t.delay_minutes} min</div>
                            </div>
                          ))}
                          {stationIntelligence.status === 'HIGH CONGESTION' && (
                            <div className="bg-warning/5 border border-warning/10 rounded-lg p-3">
                              <div className="text-xs font-semibold text-warning mb-0.5">High Congestion</div>
                              <div className="text-xs text-muted-foreground">Multiple trains delayed in station vicinity</div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-6">
                          <CheckCircle2 className="w-8 h-8 text-success mb-2 mx-auto opacity-80" />
                          <div className="text-xs font-medium text-foreground">No Active Alerts</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-4">
                      <Link 
                        href="/network/map"
                        className="w-full flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-lg text-xs font-semibold transition-colors border border-border"
                      >
                        <MapPin className="w-3.5 h-3.5" /> View on Network Map
                      </Link>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
