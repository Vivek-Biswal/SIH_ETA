'use client';

import React from 'react';
import Link from 'next/link';

export const LiveNetworkOverview: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl flex flex-col shadow-sm transition-colors h-full min-h-[400px]">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Live Network Overview</h2>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center bg-muted rounded-md p-1">
            <button className="px-3 py-1 text-xs font-medium bg-background text-foreground rounded shadow-sm">All Trains</button>
            <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded transition-colors">Delayed</button>
            <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded transition-colors">Critical</button>
          </div>
          <Link 
            href="/network" 
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View Full Network
          </Link>
        </div>
      </div>
      
      {/* Map Placeholder Area */}
      <div className="flex-1 bg-muted/30 relative flex flex-col items-center justify-center p-8 rounded-b-xl overflow-hidden min-h-[320px]">
        
        {/* Conceptual placeholder styling to show where map goes */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center shadow-sm mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" x2="9" y1="3" y2="18"></line><line x1="15" x2="15" y1="6" y2="21"></line></svg>
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Interactive Map Region</h3>
          <p className="text-sm text-muted-foreground">
            Live railway network visualization and train tracking will be rendered here.
          </p>
        </div>
        
        {/* Fake decorative elements simulating a map layout */}
        <div className="absolute top-8 left-8 flex items-center gap-2 z-10 opacity-60">
          <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <span className="text-xs font-medium text-foreground bg-card/80 px-2 py-0.5 rounded border border-border backdrop-blur-sm">NDLS</span>
        </div>
        
        <div className="absolute bottom-12 right-12 flex items-center gap-2 z-10 opacity-60">
          <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
          <span className="text-xs font-medium text-foreground bg-card/80 px-2 py-0.5 rounded border border-border backdrop-blur-sm">12951 (Delayed)</span>
        </div>
        
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 50 Q 200 100, 300 300 T 500 400" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-primary" />
        </svg>

      </div>
    </div>
  );
};
