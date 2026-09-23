import React, { useState } from 'react';
import { ArrowRight, MapPin, ArrowUpDown, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FindTrainsCard() {
  const [origin, setOrigin] = useState('AADR');
  const [destination, setDestination] = useState('NDLS');
  const router = useRouter();

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = () => {
    if (origin && destination) {
      router.push(`/trains?from=${origin}&to=${destination}`);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center space-x-3">
        <ArrowRight className="w-5 h-5 text-blue-500" />
        <h3 className="text-white font-semibold text-lg">Find Trains</h3>
      </div>
      
      <div className="p-5 flex-1 flex flex-col relative">
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex items-center space-x-4 bg-[#1F2937] px-4 py-3 rounded-lg border border-gray-700">
            <MapPin className="w-5 h-5 text-green-500" />
            <input 
              type="text" 
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin Station"
              className="bg-transparent border-none text-white focus:outline-none flex-1 font-medium"
            />
          </div>
          
          <div className="flex items-center space-x-4 bg-[#1F2937] px-4 py-3 rounded-lg border border-gray-700">
            <MapPin className="w-5 h-5 text-blue-500" />
            <input 
              type="text" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination Station"
              className="bg-transparent border-none text-white focus:outline-none flex-1 font-medium"
            />
          </div>
        </div>

        <button 
          onClick={handleSwap}
          className="absolute right-8 top-[4.5rem] bg-[#1F2937] p-2 rounded-full border border-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        <button 
          onClick={handleSearch}
          className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex justify-center items-center space-x-2"
        >
          <span>View Trains</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
