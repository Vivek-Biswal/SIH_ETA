import { NetworkWorkspace } from '@/components/network/NetworkWorkspace';
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <NetworkWorkspace key={mode === 'history' ? 'history' : 'live'} initialMode={mode === 'history' ? 'history' : 'live'} />;
}
