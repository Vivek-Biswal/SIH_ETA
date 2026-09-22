'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Train, Bell, User } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trains', href: '/trains', icon: Train },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Profile', href: '/settings', icon: User },
];

export const MobileBottomNavigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-colors">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};
