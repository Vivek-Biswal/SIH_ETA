'use client';

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <header className="h-16 bg-[var(--color-sidebar-bg)] border-b border-white/5 px-4 md:px-6 flex items-center justify-between flex-shrink-0">
      {/* Global Quick Search & Mobile Menu */}
      <div className="flex items-center gap-3 flex-1 md:w-96 md:flex-none">
        <button className="md:hidden p-1.5 text-[var(--color-sidebar-muted)] hover:text-white rounded hover:bg-[var(--color-sidebar-hover)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
        <div className="hidden md:block">
          <span className="text-white font-medium">EQUINOX01</span>
        </div>
      </div>

      {/* Right User Profile (from reference image) */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded-md transition-colors">
          <div className="w-7 h-7 rounded-full bg-[var(--color-brand-blue)] flex items-center justify-center text-white text-xs font-semibold">
            S
          </div>
          <span className="text-sm font-medium text-white hidden sm:block">
            Sneha
          </span>
          <ChevronDown className="w-4 h-4 text-[var(--color-sidebar-muted)] hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
