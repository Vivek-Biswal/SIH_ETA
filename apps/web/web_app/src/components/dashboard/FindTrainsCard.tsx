'use client';

import React, { useState } from 'react';
import { ArrowRight, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StationAutocomplete } from './StationAutocomplete';

export function FindTrainsCard() {
  const [originCode, setOriginCode] = useState('');
  const [originName, setOriginName] = useState('');
  const [destCode, setDestCode] = useState('');
  const [destName, setDestName] = useState('');
  const router = useRouter();

  const handleSwap = () => {
    const tmpCode = originCode;
    const tmpName = originName;
    setOriginCode(destCode);
    setOriginName(destName);
    setDestCode(tmpCode);
    setDestName(tmpName);
  };

  const handleSearch = () => {
    if (originCode && destCode) {
      router.push(`/trains?from=${originCode}&to=${destCode}`);
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
          <StationAutocomplete
            value={originCode}
            displayValue={originName}
            onChange={(code, name) => { setOriginCode(code); setOriginName(name); }}
            onClear={() => { setOriginCode(''); setOriginName(''); }}
            placeholder="Origin Station"
            iconColor="text-green-500"
          />
          
          <StationAutocomplete
            value={destCode}
            displayValue={destName}
            onChange={(code, name) => { setDestCode(code); setDestName(name); }}
            onClear={() => { setDestCode(''); setDestName(''); }}
            placeholder="Destination Station"
            iconColor="text-blue-500"
          />
        </div>

        <button 
          onClick={handleSwap}
          className="absolute right-8 top-[4.5rem] bg-[#1F2937] p-2 rounded-full border border-gray-700 text-gray-400 hover:text-white transition-colors z-10"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        <button 
          onClick={handleSearch}
          disabled={!originCode || !destCode}
          className="mt-auto w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex justify-center items-center space-x-2"
        >
          <span>View Trains</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
