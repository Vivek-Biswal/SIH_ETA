'use client';

import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { Search, User } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <header className="h-14 bg-[#18181B] border-b border-white/10 px-4 md:px-6 flex items-center justify-between flex-shrink-0">
      {/* Global Quick Search & Mobile Menu */}
      <div className="flex items-center gap-3 flex-1 md:w-96 md:flex-none">
        <button className="md:hidden p-1.5 text-[#A1A1AA] hover:text-white rounded hover:bg-white/5 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
        <div className="relative w-full max-w-sm hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search train, station..."
            className="w-full bg-[#09090B] border border-white/10 rounded px-3 py-1.5 pl-9 text-xs text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#3B82F6] font-mono"
          />
        </div>
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
            V1 PROTOTYPE
          </span>
          <StatusBadge type="INFO" label="SIMULATED FEED" pulse />
        </div>
        <div className="sm:hidden">
          <StatusBadge type="INFO" label="PROTOTYPE" pulse />
        </div>


        <div className="hidden sm:block h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-white text-xs border border-white/10 font-mono">
            OP
          </div>
          <div className="hidden md:flex flex-col text-left">
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
