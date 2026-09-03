'use client';

import React from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Bell, CheckCheck } from 'lucide-react';

const mockAlerts = [
  {
    id: 1,
    title: 'Severe Delay Escalation — Train 12301',
    description: 'Predicted delay increased by +24 min between CNB and ALD due to freight traffic bottleneck.',
    type: 'CRITICAL' as const,
    time: '4m ago',
    train: '12301',
  },
  {
    id: 2,
    title: 'Track Occupancy Conflict Detected',
    description: 'Precedence conflict at Mughalsarai junction between Rajdhani #12301 and Goods #8841.',
    type: 'CRITICAL' as const,
    time: '12m ago',
    train: 'DDU-ZONE',
  },
  {
    id: 3,
    title: 'Speed Restriction Warning',
    description: 'Permanent way engineering caution order in effect on ALJN-TDL sector. 30 km/h limit.',
    type: 'WARNING' as const,
    time: '34m ago',
    train: 'ALJN-TDL',
  },
];

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Operations Alerts Center
            <span className="text-xs bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] px-2 py-0.5 rounded-full font-mono font-bold">
              3 UNRESOLVED
            </span>
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Real-time conflict alerts and automated ETA deviation triggers
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-xs font-mono text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-colors">
          <CheckCheck className="w-3.5 h-3.5" /> Mark All Acknowledged
        </button>
      </div>

      <div className="space-y-3">
        {mockAlerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-[#18181B] border border-white/10 rounded-sm p-4 flex items-start justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <StatusBadge type={alert.type} />
                <span className="text-sm font-bold text-white">{alert.title}</span>
                <span className="text-xs font-mono text-[#3B82F6] bg-[#3B82F6]/10 px-1.5 py-0.5 rounded border border-[#3B82F6]/20">
                  {alert.train}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">{alert.description}</p>
            </div>
            <span className="text-xs font-mono text-[#A1A1AA] whitespace-nowrap">
              {alert.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
