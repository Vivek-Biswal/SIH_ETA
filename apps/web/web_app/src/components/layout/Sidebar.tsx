'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Activity,
  Network,
  BarChart3,
  Radio,
  Bell,
  Settings,
  ShieldAlert,
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Train Search', href: '/trains', icon: Search },
  { name: 'Network Overview', href: '/network', icon: Network },
  { name: 'Congestion', href: '/network/congestion', icon: Activity },
  { name: 'Delay Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Live Feed', href: '/live', icon: Radio },
  { name: 'Alerts', href: '/alerts', icon: Bell, badge: '7' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#18181B] border-r border-white/10 flex flex-col justify-between flex-shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-14 border-b border-white/10 flex items-center px-4 gap-2.5">
          <div className="w-6 h-6 rounded bg-[#3B82F6] flex items-center justify-center font-mono font-bold text-white text-xs">
            ET
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              SIH ETA
              <span className="text-[10px] px-1 py-0.2 bg-[#3B82F6]/20 text-[#3B82F6] rounded border border-[#3B82F6]/30 font-mono">
                OPS
              </span>
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white text-[#3B82F6] font-bold'
                        : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-white/10 text-xs">
        <div className="flex items-center justify-between text-[#A1A1AA] mb-1 font-mono text-[11px]">
          <span>FEED STATUS</span>
          <span className="text-[#22C55E] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            ONLINE
          </span>
        </div>
        <div className="text-[10px] text-[#A1A1AA]/60 font-mono">
          ZONE: NR-CENTRAL | WS: CONNECTED
        </div>
      </div>
    </aside>
  );
};
