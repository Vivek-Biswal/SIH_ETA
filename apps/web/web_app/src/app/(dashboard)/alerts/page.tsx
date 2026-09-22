'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { RailwayApiService } from '@/services/api';
import { TrainStatus, BottleneckResponse } from '@/types/api';
import { StatusBadge, BadgeType } from '@/components/common/StatusBadge';
import { AlertCircle, AlertTriangle, Info, Clock, MapPin, Activity, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  affected_entity: string;
  entity_type: 'TRAIN' | 'SECTION' | 'NETWORK';
  impact_text: string;
  timestamp: string;
  description: string;
  train_number?: string;
  location?: string;
  data: any;
}

export default function AlertsPage() {
  const [trains, setTrains] = useState<TrainStatus[]>([]);
  const [bottlenecks, setBottlenecks] = useState<BottleneckResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'TRAIN' | 'SECTION'>('ALL');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      RailwayApiService.searchTrains().catch(() => []),
      RailwayApiService.getBottlenecks().catch(() => ({ bottlenecks: [] }))
    ]).then(([trainData, bottleneckData]) => {
      setTrains(trainData);
      setBottlenecks(Array.isArray(bottleneckData) ? bottleneckData : bottleneckData?.bottlenecks ?? []);
      setIsLoading(false);
    });
  }, []);

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    
    // Convert bottlenecks to alerts
    bottlenecks.forEach((b, i) => {
      const severity: AlertSeverity = b.risk === 'critical' ? 'CRITICAL' : b.risk === 'high' ? 'WARNING' : 'INFO';
      list.push({
        id: `bn-${i}`,
        title: `Network Bottleneck: ${b.location}`,
        severity,
        affected_entity: b.location,
        entity_type: 'SECTION',
        impact_text: `${b.affected_trains} trains affected`,
        timestamp: 'Live',
        description: b.reason,
        location: b.location,
        data: b
      });
    });

    // Convert delayed/critical trains to alerts
    trains.forEach((t) => {
      if (t.status === 'CRITICAL' || t.delay_minutes > 30) {
        const severity: AlertSeverity = t.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
        list.push({
          id: `tr-${t.train_number}`,
          title: `Train Disruption: ${t.train_number}`,
          severity,
          affected_entity: `${t.train_number} ${t.train_name}`,
          entity_type: 'TRAIN',
          impact_text: `+${t.delay_minutes} min delay`,
          timestamp: 'Live',
          description: `Train is currently experiencing significant delays near ${t.current_station?.name || 'unknown location'}.`,
          train_number: t.train_number,
          location: t.current_station?.code,
          data: t
        });
      }
    });

    return list.sort((a, b) => {
      const score = (s: AlertSeverity) => s === 'CRITICAL' ? 3 : s === 'WARNING' ? 2 : 1;
      return score(b.severity) - score(a.severity);
    });
  }, [trains, bottlenecks]);

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    if (filterType !== 'ALL' && a.entity_type !== filterType) return false;
    return true;
  });

  const selectedAlert = alerts.find(a => a.id === selectedAlertId) || null;

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.severity === 'WARNING').length;

  return (
    <div className="max-w-7xl mx-auto pb-12 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operational incidents, delays and network events requiring attention
        </p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <div className="text-sm text-muted-foreground">Loading operational alerts...</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Main Feed Column */}
          <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-xl shadow-sm">
            {/* Summary & Filters */}
            <div className="p-4 border-b border-border space-y-4 flex-shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Active Alerts</div>
                  <div className="text-xl font-bold">{alerts.length}</div>
                </div>
                <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  <div className="text-xs text-destructive mb-1 font-medium">Critical</div>
                  <div className="text-xl font-bold text-destructive">{criticalCount}</div>
                </div>
                <div className="bg-warning/10 p-3 rounded-lg border border-warning/20">
                  <div className="text-xs text-warning mb-1 font-medium">Warning</div>
                  <div className="text-xl font-bold text-warning">{warningCount}</div>
                </div>
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Train Issues</div>
                  <div className="text-xl font-bold">{alerts.filter(a => a.entity_type === 'TRAIN').length}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex gap-2">
                  <select 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value as any)}
                    className="bg-background border border-border rounded-md px-2 py-1 text-xs font-medium"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">Critical Only</option>
                    <option value="WARNING">Warnings Only</option>
                  </select>
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-background border border-border rounded-md px-2 py-1 text-xs font-medium"
                  >
                    <option value="ALL">All Types</option>
                    <option value="TRAIN">Trains</option>
                    <option value="SECTION">Sections</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Feed List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <CheckCircle2 className="w-10 h-10 text-success mb-3 opacity-80" />
                  <div className="text-sm font-medium text-foreground mb-1">No active alerts</div>
                  <p className="text-xs text-muted-foreground">The network is operating normally based on current filters.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAlerts.map(alert => {
                    const isSelected = selectedAlertId === alert.id;
                    return (
                      <div 
                        key={alert.id}
                        onClick={() => setSelectedAlertId(alert.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-muted border-primary shadow-sm' 
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {alert.severity === 'CRITICAL' ? <AlertCircle className="w-5 h-5 text-destructive" /> :
                             alert.severity === 'WARNING' ? <AlertTriangle className="w-5 h-5 text-warning" /> :
                             <Info className="w-5 h-5 text-info" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="text-sm font-bold text-foreground truncate">{alert.title}</h3>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted px-1.5 py-0.5 rounded">
                                {alert.timestamp}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2 line-clamp-1">{alert.description}</div>
                            <div className="flex items-center gap-3 text-[11px] font-medium">
                              <span className={alert.severity === 'CRITICAL' ? 'text-destructive' : 'text-warning'}>
                                {alert.impact_text}
                              </span>
                              <span className="text-muted-foreground border-l border-border pl-3">
                                {alert.affected_entity}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedAlert && (
            <div className="w-full lg:w-96 flex-shrink-0 bg-card border border-border rounded-xl shadow-sm flex flex-col min-h-0">
              <div className="p-5 border-b border-border flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge type={selectedAlert.severity as BadgeType} />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{selectedAlert.entity_type} ALERT</span>
                  </div>
                  <h2 className="text-base font-bold text-foreground leading-tight">{selectedAlert.title}</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Event Details */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Event Details</h3>
                  <p className="text-sm text-foreground leading-relaxed">{selectedAlert.description}</p>
                </div>

                {/* Impact */}
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Operational Impact</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground">Severity</div>
                        <div className={`text-sm font-semibold ${selectedAlert.severity === 'CRITICAL' ? 'text-destructive' : 'text-warning'}`}>
                          {selectedAlert.severity}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground">Estimated Impact</div>
                        <div className="text-sm font-medium text-foreground">{selectedAlert.impact_text}</div>
                      </div>
                    </div>
                    {selectedAlert.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-muted-foreground">Location</div>
                          <div className="text-sm font-medium text-foreground">{selectedAlert.location}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline (Static mock for snapshot) */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Event Timeline</h3>
                  <div className="relative pl-4 border-l border-border space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                      <div className="text-[10px] text-muted-foreground mb-0.5">Just now</div>
                      <div className="text-xs font-medium text-foreground">Alert status updated</div>
                    </div>
                    <div className="relative opacity-60">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-muted ring-4 ring-card" />
                      <div className="text-[10px] text-muted-foreground mb-0.5">Earlier</div>
                      <div className="text-xs font-medium text-foreground">Anomaly detected in snapshot</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border bg-muted/10">
                {selectedAlert.entity_type === 'TRAIN' && selectedAlert.train_number ? (
                  <Link 
                    href={`/trains/${selectedAlert.train_number}`}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    View Train Intelligence <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link 
                    href="/network"
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    View Network Map <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
