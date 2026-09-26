import Link from 'next/link';
import { Search, MapPin, Activity, Route } from 'lucide-react';

export function QuickActions() {
  const actions = [
    { name: 'Search Train', icon: Search, href: '/trains', desc: 'Find by number/name', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Check Station', icon: MapPin, href: '/stations', desc: 'Live departures', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Live Network', icon: Activity, href: '/network', desc: 'System health', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Track Journey', icon: Route, href: '/trains', desc: 'Station to station', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Link 
          key={action.name} 
          href={action.href}
          className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300"
        >
          <div className={`p-3 rounded-xl ${action.bg} ${action.color} mb-3 group-hover:scale-110 transition-transform duration-300`}>
            <action.icon size={24} />
          </div>
          <h3 className="font-semibold text-sm text-foreground">{action.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 text-center">{action.desc}</p>
        </Link>
      ))}
    </div>
  );
}
