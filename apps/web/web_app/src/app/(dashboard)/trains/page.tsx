import { Suspense } from 'react';
import { PassengerResults } from '@/components/dashboard/PassengerResults';
export default function TrainsPage() { return <Suspense fallback={<p>Loading search…</p>}><PassengerResults /></Suspense>; }
