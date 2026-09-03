'use client';

import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { Search, User } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <header className="h-14 bg-[#18181B] border-b border-white/10 px-6 flex items-center justify-between flex-shrink-0">
      {/* Global Quick Search */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search train number, station (e.g. 12301, CNB)..."
            className="w-full bg-[#09090B] border border-white/10 rounded px-3 py-1.5 pl-9 text-xs text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex items-center gap-4">
        <StatusBadge type="LIVE" label="FEED ACTIVE" pulse />

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-white text-xs border border-white/10 font-mono">
            OP
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-white leading-tight">
              Control Room
            </span>
            <span className="text-[10px] text-[#A1A1AA] font-mono leading-tight">
              Section Controller
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
