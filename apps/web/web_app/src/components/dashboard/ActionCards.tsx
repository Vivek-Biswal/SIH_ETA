import React from 'react';
import { Map, MapPin, ArrowRight, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function RailRadarCard() {
  const router = useRouter();

  return (
    <div 
      onClick={() => router.push('/network')}
      className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg flex items-center justify-between cursor-pointer hover:border-gray-700 hover:bg-[#151e32] transition-all group"
    >
      <div className="flex items-center space-x-4">
        <div className="bg-blue-500/10 p-3 rounded-full border border-blue-500/20 group-hover:scale-110 transition-transform">
          <Navigation className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
            <span>RailRadar Live Map</span>
          </h3>
          <p className="text-gray-400 text-sm">Real-time GPS tracking across India</p>
        </div>
      </div>
      <div className="flex items-center space-x-1 text-blue-500 font-medium">
        <span>Open</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  );
}

export function MultiCityCard() {
  return (
    <div 
      className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg flex items-center justify-between cursor-pointer hover:border-gray-700 hover:bg-[#151e32] transition-all group opacity-80"
    >
      <div className="flex items-center space-x-4">
        <div className="bg-purple-500/10 p-3 rounded-full border border-purple-500/20 group-hover:scale-110 transition-transform">
          <Map className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center space-x-3">
            <span>Plan a Multi-City Trip</span>
            <div className="flex items-center space-x-1">
              <span className="bg-purple-500/20 text-purple-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-purple-500/30">New</span>
              <span className="text-purple-400/70 text-[10px] uppercase font-bold px-1">• Most Powerful</span>
            </div>
          </h3>
          <p className="text-gray-400 text-sm">Add up to 6 stops with stay days — one search, full plan</p>
        </div>
      </div>
      <div className="flex items-center space-x-1 text-purple-400 font-medium">
        <span>Plan</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  );
}
