'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  MapPin,
  Network,
  BarChart3,
  FileText,
  Settings,
  Train
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'ETA Prediction', href: '/trains', icon: Search },
  { name: 'Train Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Stations', href: '/stations', icon: MapPin },
  { name: 'Network Intelligence', href: '/network', icon: Network },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[var(--color-sidebar-bg)] border-r border-white/5 flex flex-col justify-between flex-shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 border-b border-white/10 flex items-center px-4 gap-3">
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-[var(--color-brand-blue)] shadow-sm">
            <Train className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-white leading-tight">
              EQUINOX01
            </span>
            <span className="text-[11px] text-[var(--color-sidebar-muted)] font-medium leading-tight">
              Railway Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-sidebar-active)] text-white shadow-sm'
                    : 'text-[var(--color-sidebar-muted)] hover:text-white hover:bg-[var(--color-sidebar-hover)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
