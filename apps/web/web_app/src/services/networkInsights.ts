import { PASSENGER_API } from './passenger';
export type Bottleneck = { station: string; interactions: number; mean_source_delay_minutes: number; mean_gap_minutes: number; risk_score: number; risk: string; bottleneck_score: number };
export type Interaction = { service_date: string; station: string; source_train: string; target_train: string; source_delay_minutes: number; target_delay_minutes: number; gap_minutes: number; risk_score: number; risk: string };
export type Insights = { data_source: 'historical'; period_start: string; period_end: string; station_count: number; interaction_count: number; high_risk_count: number; stations: Bottleneck[]; interactions: Interaction[]; explanation: string };
export async function loadInsights(query: string, signal: AbortSignal): Promise<Insights> {
  const response = await fetch(`${PASSENGER_API}/network/insights?q=${encodeURIComponent(query)}&limit=50`, { signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]), cache: 'no-store' });
  if (!response.ok) throw new Error('Network analysis is unavailable. Please retry.');
  const data = await response.json();
  if (data.data_source !== 'historical' || !Array.isArray(data.stations) || !Array.isArray(data.interactions)) throw new Error('The analysis response could not be verified.');
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  if (![data.station_count, data.interaction_count, data.high_risk_count].every(finite) ||
      !data.stations.every((s: Bottleneck) => typeof s.station === 'string' && [s.interactions, s.mean_source_delay_minutes, s.mean_gap_minutes, s.bottleneck_score].every(finite)) ||
      !data.interactions.every((r: Interaction) => /^\d{5}$/.test(r.source_train) && /^\d{5}$/.test(r.target_train) && [r.risk_score, r.source_delay_minutes, r.target_delay_minutes, r.gap_minutes].every(finite))) throw new Error('The analysis contains incomplete records.');
  return data;
}
