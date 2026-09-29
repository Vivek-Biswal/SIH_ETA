import { NetworkWorkspace } from '@/components/network/NetworkWorkspace';

export const metadata = { title: 'Eternal — Journey insights' };

export default function JourneyInsightsPage() {
  return <main className="h-dvh overflow-y-auto bg-background p-4"><NetworkWorkspace brand="Eternal" /></main>;
}
