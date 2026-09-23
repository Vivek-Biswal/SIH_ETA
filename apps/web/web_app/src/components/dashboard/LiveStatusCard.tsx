import React, { useState } from 'react';
import { Train, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LiveStatusCard() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (query) {
      router.push(`/live/${query}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center space-x-3">
        <Train className="w-5 h-5 text-blue-500" />
        <h3 className="text-white font-semibold text-lg">Live Train Status</h3>
      </div>
      
      <div className="p-5">
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-[#1F2937] px-4 py-3.5 rounded-xl border border-gray-700 flex items-center">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter train number or name..."
              className="bg-transparent border-none text-white focus:outline-none flex-1 text-sm md:text-base placeholder-gray-500"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="bg-[#2563EB] hover:bg-blue-600 p-3.5 rounded-xl text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
