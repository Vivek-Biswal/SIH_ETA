'use client';

import React from 'react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          System & Controller Preferences
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Configure telemetry update frequency and display parameters
        </p>
      </div>

      <div className="bg-[#18181B] border border-white/10 rounded-sm divide-y divide-white/10 text-xs">
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="font-bold text-white">Live Feed Polling Interval</div>
            <div className="text-[#A1A1AA] mt-0.5">
              Frequency of background sync for station timetable updates
            </div>
          </div>
          <select className="bg-[#09090B] border border-white/10 rounded px-3 py-1.5 text-white font-mono focus:outline-none">
            <option>10 Seconds (High Density)</option>
            <option>30 Seconds (Default)</option>
            <option>60 Seconds (Low Bandwidth)</option>
          </select>
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="font-bold text-white">High Contrast Monospace Data</div>
            <div className="text-[#A1A1AA] mt-0.5">
              Enforce tabular JetBrains Mono alignment across all tables
            </div>
          </div>
          <input
            type="checkbox"
            defaultChecked
            className="w-4 h-4 accent-[#3B82F6] cursor-pointer"
          />
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="font-bold text-white">WebSocket Gateway Endpoint</div>
            <div className="text-[#A1A1AA] mt-0.5 font-mono">
              ws://localhost:8000/ws/trains/live
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] font-mono text-[10px] font-bold">
            CONNECTED
          </span>
        </div>
      </div>
    </div>
  );
}
