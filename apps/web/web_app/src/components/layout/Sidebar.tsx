'use client';

import React from 'react';
import Link from 'next/link';
import { BrandMark } from './BrandMark';
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
  { name: 'Journey insights', href: '/network', icon: Network },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Alerts', href: '/alerts', icon: Bell },
];

const secondaryNavigation = [
  { name: 'Stations', href: '/stations', icon: MapPin },
  { name: 'Routes', href: '/network/congestion', icon: Navigation },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside aria-label="Main navigation" className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col flex-shrink-0 select-none transition-colors">
      <div className="contents">
        {/* Brand Header */}
        <Link href="/dashboard" aria-label="Etaernal home" className="h-18 shrink-0 border-b border-[var(--sidebar-border)] flex items-center px-6 gap-4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-4px]">
          <BrandMark />
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold tracking-tight text-[var(--sidebar-foreground)] leading-tight">
              Etaernal
            </span>
            <span className="text-[10px] mt-1 text-[var(--sidebar-muted)] font-medium leading-tight">
              Railway Intelligence
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6">
          <div className="px-6 mb-3">
            <span className="text-[10px] font-bold tracking-wider text-[var(--sidebar-muted)] uppercase">Operations</span>
          </div>
          <nav aria-label="Operations" className="px-3 space-y-1 mb-7">
            {primaryNavigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && item.href !== '/network' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    isActive
                      ? 'bg-primary/9 text-primary'
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

          <div className="px-6 mb-3">
            <span className="text-[10px] font-bold tracking-wider text-[var(--sidebar-muted)] uppercase">Directory</span>
          </div>
          <nav aria-label="Directory" className="px-3 space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    isActive
                      ? 'bg-primary/9 text-primary'
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
        <div className="px-3 py-4 shrink-0 border-t border-[var(--sidebar-border)]">
          <Link
            href="/settings"
            prefetch={false}
            aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
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
