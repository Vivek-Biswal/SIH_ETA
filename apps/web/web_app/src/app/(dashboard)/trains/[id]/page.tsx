import Link from 'next/link';
import { PassengerJourney } from '@/components/eta/PassengerJourney';
export default async function TrainPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <div className="max-w-6xl mx-auto space-y-5 pb-8"><Link href="/dashboard" className="text-primary text-sm">← Back to dashboard</Link><PassengerJourney key={id + String(query.date || '')} number={id} date={typeof query.date === 'string' ? query.date : ''} target={typeof query.station === 'string' ? query.station : ''} /></div>;
}
