'use client';

import React, { Suspense } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Layers, RefreshCw, ZoomIn, ZoomOut, Train, ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function MapContent() {
  const searchParams = useSearchParams();
  const selectedTrain = searchParams.get('train');

  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] rounded-xl border border-border overflow-hidden bg-zinc-950">
      {/* Dark stylized SVG network grid representing Indian Railway corridors */}
      <svg className="w-full h-full opacity-60">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Normal Corridors (Brand Blue) */}
        <path d="M 150 180 Q 300 240 500 350 T 850 650" fill="none" stroke="#3B82F6" strokeWidth="3" />
        <path d="M 500 350 Q 600 480 700 700" fill="none" stroke="#3B82F6" strokeWidth="2.5" />

        {/* Congested Corridor (Warning Amber) */}
        <path d="M 500 350 L 720 380" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="6,4" />

        {/* Conflict Corridor (Critical Red) */}
        <path d="M 320 220 L 480 340" fill="none" stroke="#EF4444" strokeWidth="4" />

        {/* Station Nodes */}
        <circle cx="150" cy="180" r="5" fill="#FFFFFF" />
        <text x="160" y="185" fill="#A1A1AA" fontSize="11" fontFamily="monospace">NDLS (New Delhi)</text>

        <circle cx="320" cy="220" r="4" fill="#FFFFFF" />
        <text x="330" y="225" fill="#A1A1AA" fontSize="11" fontFamily="monospace">CNB (Kanpur)</text>

        <circle cx="500" cy="350" r="6" fill="#EF4444" />
        <text x="515" y="355" fill="#EF4444" fontSize="12" fontWeight="bold" fontFamily="monospace">MGS/DDU [CONFLICT]</text>

        <circle cx="720" cy="380" r="4" fill="#F59E0B" />
        <text x="730" y="385" fill="#F59E0B" fontSize="11" fontFamily="monospace">HWH (Howrah)</text>

        <circle cx="700" cy="700" r="5" fill="#FFFFFF" />
        <text x="710" y="705" fill="#A1A1AA" fontSize="11" fontFamily="monospace">MAS (Chennai)</text>
      </svg>

      {/* Floating Map Legend */}
      <div className="absolute top-4 left-4 p-4 rounded-lg border border-border bg-card/85 backdrop-blur-md space-y-2 text-xs font-mono shadow-lg">
        <div className="font-bold text-foreground uppercase text-[11px] mb-2 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Corridor Status Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-primary rounded" />
          <span className="text-muted-foreground">Normal Operation (Free flow)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-warning rounded" />
          <span className="text-muted-foreground">Moderate Congestion (1-14m delay)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-destructive rounded" />
          <span className="text-muted-foreground">Critical Conflict (15m+ bottleneck)</span>
        </div>
      </div>

      {/* Contextual Entity Tracking Overlay */}
      {selectedTrain && (
        <div className="absolute top-4 right-16 p-4 rounded-lg border border-primary/50 bg-primary/10 backdrop-blur-md shadow-lg flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4 text-primary" />
            <span className="font-bold text-foreground text-sm">Tracking: {selectedTrain}</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Train location approximated on operational map. Live GPS telemetry is currently disabled in snapshot view.
          </p>
          <Link 
            href={`/trains/${selectedTrain}`}
            className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 px-3 rounded text-xs font-semibold transition-colors"
          >
            View Intelligence <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Floating Telemetry Box bottom left */}
      <div className="absolute bottom-4 left-4 p-4 rounded-lg border border-border bg-card/85 backdrop-blur-md max-w-sm space-y-2 text-xs shadow-lg">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground font-mono">SECTOR TELEMETRY [DEMO]</span>
          <StatusBadge type="CRITICAL" label="INTERVENTION REQUIRED" />
        </div>
        <p className="text-xs text-muted-foreground">
          Block conflict on CNB-DDU corridor. 2 Rajdhani services in queue behind freight rake #8841.
        </p>
      </div>

      {/* Map Action Buttons top right */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button className="p-2 rounded-md bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>
        <button className="p-2 rounded-md bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-sm">
          <ZoomIn className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>
        <button className="p-2 rounded-md bg-card border border-border hover:bg-muted text-foreground transition-colors shadow-sm">
          <ZoomOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}

export default function NetworkMapPage() {
  return (
    <Suspense fallback={<div className="w-full h-full bg-card rounded-xl border border-border animate-pulse" />}>
      <MapContent />
    </Suspense>
  );
}
