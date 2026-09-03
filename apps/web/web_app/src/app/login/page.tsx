'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('controller_04');
  const [password, setPassword] = useState('••••••••••••');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen w-screen bg-[#09090B] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#18181B] border border-white/10 rounded-sm p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded bg-[#3B82F6] flex items-center justify-center font-mono font-bold text-white text-base">
            ET
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            SIH ETA Operations Portal
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Restricted Section Controller & Operations Terminal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1 font-mono">
              Controller Identifier / Badge
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#09090B] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#3B82F6] font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1 font-mono">
              Authorization Token
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#09090B] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#3B82F6] font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-bold text-white font-mono transition-colors tracking-wide"
          >
            AUTHENTICATE & ENTER COCKPIT
          </button>
        </form>

        <div className="text-center pt-2">
          <span className="text-[10px] text-[#A1A1AA]/60 font-mono">
            SECURED BY CRIS / IR NETWORK GATEWAY
          </span>
        </div>
      </div>
    </div>
  );
}
