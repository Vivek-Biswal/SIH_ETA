'use client';

import React from 'react';
import { Search, Filter, Layers } from 'lucide-react';

interface MapFiltersProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-[500] flex flex-col sm:flex-row gap-3 pointer-events-none">
      {/* Search Bar */}
      <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg shadow-md flex items-center px-3 h-10 flex-1 max-w-sm pointer-events-auto transition-colors">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input 
          type="text" 
          placeholder="Search train, station or route..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
        />
      </div>

      {/* Filter Chips */}
      <div className="bg-card/90 backdrop-blur-md border border-border rounded-lg shadow-md flex items-center p-1 pointer-events-auto overflow-x-auto no-scrollbar transition-colors">
        <button 
          onClick={() => setFilterStatus('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${filterStatus === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          All Trains
        </button>
        <button 
          onClick={() => setFilterStatus('ON_TIME')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterStatus === 'ON_TIME' ? 'bg-success/20 text-success' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <span className={`w-2 h-2 rounded-full ${filterStatus === 'ON_TIME' ? 'bg-success' : 'bg-muted-foreground'}`}></span>
          On Time
        </button>
        <button 
          onClick={() => setFilterStatus('DELAYED')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterStatus === 'DELAYED' ? 'bg-warning/20 text-warning' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <span className={`w-2 h-2 rounded-full ${filterStatus === 'DELAYED' ? 'bg-warning' : 'bg-muted-foreground'}`}></span>
          Delayed
        </button>
        <button 
          onClick={() => setFilterStatus('CRITICAL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${filterStatus === 'CRITICAL' ? 'bg-destructive/20 text-destructive' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <span className={`w-2 h-2 rounded-full ${filterStatus === 'CRITICAL' ? 'bg-destructive' : 'bg-muted-foreground'}`}></span>
          Critical
        </button>
      </div>
      
      {/* Additional Controls */}
      <div className="flex gap-2 ml-auto pointer-events-auto">
        <button className="bg-card/90 backdrop-blur-md border border-border rounded-lg shadow-md h-10 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Map Layers">
          <Layers className="w-4 h-4" />
        </button>
        <button className="bg-card/90 backdrop-blur-md border border-border rounded-lg shadow-md h-10 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Advanced Filters">
          <Filter className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
