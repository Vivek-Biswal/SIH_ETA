'use client';

import React from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Radio, Filter } from 'lucide-react';

const mockLiveFeedEvents = [
  {
    id: 1,
    time: '21:04:32',
    train: '12301',
    type: 'CRITICAL' as const,
    message: 'Train 12301 delayed +52 min at CNB due to block conflict',
  },
  {
    id: 2,
    time: '21:03:18',
    train: '12273',
    type: 'ON_TIME' as const,
    message: 'Train 12273 arrived NDLS on platform 12 on time',
  },
  {
    id: 3,
    time: '21:02:47',
    train: 'NETWORK',
    type: 'WARNING' as const,
    message: 'Heavy corridor congestion detected on NDLS-MGS block',
  },
  {
    id: 4,
    time: '20:59:12',
    train: '22221',
    type: 'WARNING' as const,
    message: 'Train 22221 speed reduced to 45 km/h at BPL section',
  },
];

export default function LiveFeedPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Operational Telemetry Feed
            <StatusBadge type="LIVE" label="STREAMING" pulse />
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Real-time event log published via backend WebSocket gateway
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-xs font-mono text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filter Events
          </button>
        </div>
      </div>

      <div className="bg-[#18181B] border border-white/10 rounded-sm divide-y divide-white/10 font-mono text-xs">
        {mockLiveFeedEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-[#A1A1AA]">{evt.time}</span>
              <StatusBadge type={evt.type} />
              <span className="text-white font-bold">{evt.train}</span>
              <span className="text-[#A1A1AA] font-sans">{evt.message}</span>
            </div>
            <span className="text-[10px] text-[#A1A1AA]">SOURCE: WS-EVENT</span>
          </div>
        ))}
      </div>
    </div>
  );
}
