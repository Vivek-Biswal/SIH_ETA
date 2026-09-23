'use client';

import React, { useState } from 'react';
import { Train, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TrainAutocomplete } from './TrainAutocomplete';

export function LiveStatusCard() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (trainNo?: string) => {
    const q = trainNo || query;
    if (q) {
      router.push(`/live/${q}`);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center space-x-3">
        <Train className="w-5 h-5 text-blue-500" />
        <h3 className="text-white font-semibold text-lg">Live Train Status</h3>
      </div>
      
      <div className="p-5">
        <div className="flex items-center space-x-2">
          <TrainAutocomplete
            value={query}
            onChange={setQuery}
            onSubmit={handleSearch}
            placeholder="Enter train number or name..."
          />
          <button 
            onClick={() => handleSearch()}
            className="bg-[#2563EB] hover:bg-blue-600 p-3.5 rounded-xl text-white transition-colors shrink-0"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
