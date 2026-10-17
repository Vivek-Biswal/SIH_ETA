export type JourneyMode = 'history' | 'live' | 'simulation' | 'analytics';

export function parseJourneyMode(value: string | null | undefined): JourneyMode {
  return value === 'history' || value === 'simulation' || value === 'analytics' ? value : 'live';
}
