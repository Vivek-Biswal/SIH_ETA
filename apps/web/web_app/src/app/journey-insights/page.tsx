import { MobileJourneyWorkspace } from '@/components/network/MobileJourneyWorkspace';
import { parseJourneyMode } from '@/services/journeyWorkspace';

export const metadata = { title: 'Etaernal — Journey insights' };

export default async function JourneyInsightsPage({ searchParams }: { searchParams: Promise<{ mode?: string; theme?: string }> }) {
  const query = await searchParams;
  const mode = parseJourneyMode(query.mode);
  const theme = query.theme === 'dark' || query.theme === 'light' ? query.theme : undefined;
  return <main className="h-dvh overflow-y-auto overscroll-y-contain bg-background px-4 py-5"><MobileJourneyWorkspace initialMode={mode} theme={theme} /></main>;
}
