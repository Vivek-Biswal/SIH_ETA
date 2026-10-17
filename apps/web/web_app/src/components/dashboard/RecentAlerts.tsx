import Link from 'next/link';
import { Bell, ArrowUpRight } from 'lucide-react';

/** Entry point only: historical bottlenecks are never manufactured into live alerts. */
export function RecentAlerts() {
  return <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
    <Bell className="text-primary" size={22} />
    <h2 className="font-semibold">Your journey alerts</h2>
    <p className="text-sm leading-6 text-muted-foreground">Choose a train and arrival stop to check for delays and changes. A network-wide operational incident feed is not connected.</p>
    <Link href="/alerts" prefetch={false} className="inline-flex items-center gap-2 text-sm font-medium text-primary">Manage journey alerts <ArrowUpRight size={15} /></Link>
  </section>;
}
