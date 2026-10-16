import Link from 'next/link';
import { MapPin, Route, ArrowUpRight, Network } from 'lucide-react';
import styles from './PassengerDashboard.module.css';

const actions = [
  { name: 'Explore stations', icon: MapPin, href: '/stations', desc: 'Find a station, check departures and see its facilities.', tone: styles.teal },
  { name: 'Journey insights', icon: Network, href: '/network', desc: 'Follow your route and understand how delays can change.', tone: '' },
  { name: 'Plan your route', icon: Route, href: '/trains', desc: 'Find trains between two stations for your next journey.', tone: styles.violet },
];

export function QuickActions() {
  return <div className={styles.actions}>{actions.map(action => <Link key={action.name} href={action.href} prefetch={false} className={styles.action}>
    <div className={styles.actionTop}><span className={`${styles.actionIcon} ${action.tone}`}><action.icon size={20} strokeWidth={1.7} /></span><ArrowUpRight size={17} className={styles.actionArrow} /></div>
    <h3>{action.name}</h3><p>{action.desc}</p>
  </Link>)}</div>;
}
