import { NetworkWorkspace } from '@/components/network/NetworkWorkspace';

export const metadata = { title: 'Train Tracking | Etaernal' };

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <NetworkWorkspace key={mode === 'simulation' ? 'simulation' : 'live'} section="tracking" initialMode={mode === 'simulation' ? 'simulation' : 'live'} />;
}
