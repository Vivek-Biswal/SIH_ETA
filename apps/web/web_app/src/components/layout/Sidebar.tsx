'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Network,
  BarChart3,
  Settings,
  Train,
  Bell,
  Navigation
} from 'lucide-react';

const primaryNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Network', href: '/network/map', icon: MapPin },
  { name: 'ETA Intelligence', href: '/trains', icon: Train },
  { name: 'Network Intelligence', href: '/network', icon: Network },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Alerts', href: '/alerts', icon: Bell },
];

const secondaryNavigation = [
  { name: 'Stations', href: '/stations', icon: MapPin },
  { name: 'Routes', href: '/routes', icon: Navigation },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col justify-between flex-shrink-0 select-none transition-colors">
      <div>
        {/* Brand Header */}
        <div className="h-16 border-b border-[var(--sidebar-border)] flex items-center px-4 gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Train className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold tracking-tight text-[var(--sidebar-foreground)] leading-tight">
              EQUINOX01
            </span>
            <span className="text-[11px] text-[var(--sidebar-muted)] font-medium leading-tight">
              Railway Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-[var(--sidebar-muted)] uppercase">Operations</span>
          </div>
          <nav className="px-2 space-y-0.5 mb-6">
            {primaryNavigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-foreground)] shadow-sm'
                      : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)]'
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

          <div className="px-4 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-[var(--sidebar-muted)] uppercase">Directory</span>
          </div>
          <nav className="px-2 space-y-0.5 mb-6">
            {secondaryNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-foreground)] shadow-sm'
                      : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)]'
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

        {/* Settings at bottom */}
        <div className="p-4 border-t border-[var(--sidebar-border)]">
          <Link
            href="/settings"
            prefetch={false}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith('/settings')
                ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-foreground)] shadow-sm'
                : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
