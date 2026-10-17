import { NetworkWorkspace } from '@/components/network/NetworkWorkspace';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Past Delay Insights | Etaernal' };

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  if (mode === 'live' || mode === 'simulation') redirect(`/network/map${mode === 'simulation' ? '?mode=simulation' : ''}`);
  if (mode === 'analytics') redirect('/analytics');
  return <NetworkWorkspace section="history" />;
}
