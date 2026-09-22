'use client';

import React from 'react';
import { TrainStatus } from '@/types/api';
import { X, Navigation, Clock, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TrainDetailsPanelProps {
  train: TrainStatus;
  onClose: () => void;
}

export const TrainDetailsPanel: React.FC<TrainDetailsPanelProps> = ({ train, onClose }) => {
  const isDelayed = train.delay_minutes > 0;
  const isCritical = train.status === 'CRITICAL';
  
  const statusColor = isCritical ? 'text-destructive' : isDelayed ? 'text-warning' : 'text-success';
  const statusBg = isCritical ? 'bg-destructive/10' : isDelayed ? 'bg-warning/10' : 'bg-success/10';

  return (
    <div className="absolute top-16 right-4 bottom-4 w-80 bg-card border border-border rounded-xl shadow-xl z-[500] flex flex-col overflow-hidden pointer-events-auto transition-transform">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-start bg-muted/30">
        <div>
          <h2 className="font-bold text-lg text-foreground">{train.train_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-sm font-medium text-muted-foreground">{train.train_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBg} ${statusColor}`}>
              {train.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Route Info */}
        <div>
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Origin</span>
              <span className="font-medium text-foreground">NDLS</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col text-right">
              <span className="text-xs text-muted-foreground">Destination</span>
              <span className="font-medium text-foreground">CSMT</span>
            </div>
          </div>
          
          <div className="bg-muted/40 rounded-lg p-3 flex justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Navigation className="w-3 h-3" /> Speed</span>
              <span className="font-semibold text-foreground">{isCritical ? '0' : '108'} <span className="text-xs text-muted-foreground font-normal">km/h</span></span>
            </div>
            <div className="w-px bg-border"></div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Delay</span>
              <span className={`font-semibold ${isDelayed ? statusColor : 'text-success'}`}>
                {isDelayed ? `+${train.delay_minutes} min` : 'On Time'}
              </span>
            </div>
            <div className="w-px bg-border"></div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> ETA</span>
              <span className="font-semibold text-foreground">14:32</span>
            </div>
          </div>
        </div>

        {/* Journey Progress */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Journey Progress</h3>
          <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border">
            
            <div className="relative">
              <span className="absolute -left-6 w-3 h-3 rounded-full bg-muted border-2 border-card mt-1"></span>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">New Delhi (NDLS)</span>
                <span className="text-xs text-muted-foreground">08:00</span>
              </div>
            </div>
            
            <div className="relative">
              <span className={`absolute -left-6 w-3 h-3 rounded-full bg-primary border-2 border-card mt-1 shadow-[0_0_8px_rgba(59,130,246,0.6)]`}></span>
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">Mathura Jn (MTJ)</span>
                  <span className="text-[10px] font-semibold text-primary uppercase mt-0.5 tracking-wider">Current Location</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-foreground">10:15</span>
                  {isDelayed && <span className={`text-[10px] ${statusColor}`}>+{train.delay_minutes}m</span>}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <span className="absolute -left-6 w-3 h-3 rounded-full bg-background border-2 border-border mt-1"></span>
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Agra Cantt (AGC)</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase mt-0.5">Next Station</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-foreground">14:32</span>
                  <span className="text-[10px] text-muted-foreground">ETA</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <span className="absolute -left-6 w-3 h-3 rounded-full bg-background border-2 border-border mt-1"></span>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Mumbai (CSMT)</span>
                <span className="text-xs text-muted-foreground">08:15 (+1)</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Footer Action */}
      <div className="p-3 border-t border-border bg-card">
        <Link 
          href={`/trains/${train.train_number}`}
          className="w-full flex items-center justify-center py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-sm font-medium transition-colors"
        >
          View Full Intelligence
        </Link>
      </div>
    </div>
  );
};
