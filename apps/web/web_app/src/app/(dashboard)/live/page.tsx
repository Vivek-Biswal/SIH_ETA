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
  const [events, setEvents] = React.useState<any[]>(mockLiveFeedEvents);
  const [status, setStatus] = React.useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const wsRef = React.useRef<WebSocket | null>(null);

  React.useEffect(() => {
    let isActive = true;
    let reconnectTimeout: NodeJS.Timeout | undefined;

    const connectWebSocket = () => {
      if (!isActive) return;

      setStatus('CONNECTING');
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/trains/live';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isActive || ws !== wsRef.current) return;
        setStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        if (!isActive || ws !== wsRef.current) return;

        try {
          const data = JSON.parse(event.data);
          
          setEvents((prev) => {
            // Find if we already have an event for this train_id
            const existingIdx = prev.findIndex(e => e.train === data.train_id);
            
            // Stale event check: If existing event has a newer timestamp, ignore the new one.
            if (existingIdx !== -1) {
              const existingEvent = prev[existingIdx];
              // Assuming 'time' or 'timestamp' can be compared directly or parsed
              // For simplicity, we just keep the newest one received (or properly parse ISO strings)
              const existingTime = new Date(existingEvent.timestamp || existingEvent.time).getTime();
              const newTime = new Date(data.timestamp).getTime();
              
              if (existingTime > newTime) {
                console.warn(`Dropped stale event for train ${data.train_id}`);
                return prev;
              }
            }

            const formattedEvent = {
              id: Date.now() + Math.random(),
              time: new Date(data.timestamp).toLocaleTimeString('en-GB', { hour12: false }),
              timestamp: data.timestamp, // Keep raw timestamp for future stale checks
              train: data.train_id,
              type: data.event_type as any,
              message: data.message,
              dataState: data.data_state
            };

            // Add new event at the top, limit to 50 events
            return [formattedEvent, ...prev].slice(0, 50);
          });
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        if (!isActive || ws !== wsRef.current) return;
        setStatus('DISCONNECTED');
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        if (!isActive || ws !== wsRef.current) return;
        console.error("WebSocket error:", error);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      isActive = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);

      const ws = wsRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Operational Telemetry Feed
            <StatusBadge 
              type={status === 'CONNECTED' ? 'LIVE' : (status === 'CONNECTING' ? 'WARNING' : 'CRITICAL')} 
              label={status} 
              pulse={status === 'CONNECTED'} 
            />
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
        {events.map((evt) => (
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
            <span className="text-[10px] text-[#A1A1AA]">
              SOURCE: {evt.dataState === 'mock' ? 'WS-MOCK' : 'WS-EVENT'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
