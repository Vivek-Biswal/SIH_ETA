import { Suspense } from 'react';
import { PassengerDashboard } from '@/components/dashboard/PassengerDashboard';
export default function DashboardPage() { return <Suspense fallback={<p>Loading dashboard…</p>}><PassengerDashboard /></Suspense>; }
