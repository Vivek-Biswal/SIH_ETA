/** Passenger contract shared with the mobile app. No simulated fallback. */
export const PASSENGER_API = (process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://sih-eta-backend-a819.onrender.com/api/v1').replace(/\/+$/, '').replace(/(?:\/api\/v1)?$/, '/api/v1');

export type Station = { code: string; name: string };
export type Stop = {
  station: Station | null; scheduled_arrival?: string | null; scheduled_departure?: string | null;
  actual_arrival?: string | null; actual_departure?: string | null; platform?: string | null; has_departed?: boolean;
};
export type Status = {
  train_number: string; train_name: string; date: string; data_source: string; status: string;
  current_station?: Station | null; overall_delay_minutes?: number | null; route: Stop[];
  last_known_location?: { updated_at?: string; delay_minutes?: number | null } | null;
};
export type Prediction = { station: Station | null; scheduled_arrival?: string | null;
  predicted_arrival?: string | null; predicted_delay_minutes?: number | null };
export type ETA = {
  train_number: string; date: string; data_source: string; prediction_method: string;
  prediction_generated_at?: string | null; observation_timestamp?: string | null;
  explanation?: string; remaining_stations: Prediction[];
};
export type SearchTrain = { train_number: string; train_name: string; departure_time?: string | null;
  arrival_time?: string | null; duration_minutes?: number | null; days_of_run?: string[] | null };
export type SearchPage = { trains: SearchTrain[]; total: number; page: number; limit: number; data_source: string };
export type Journey = { status: Status | null; eta: ETA | null; statusError?: string; etaError?: string };

export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function searchQuery(from: string, to: string, date = '', page = 1) {
  from = from.trim().toUpperCase(); to = to.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(from) || !/^[A-Z0-9]{2,10}$/.test(to) || from === to) throw new Error('Choose two different stations from the suggestions.');
  if (date && !validDate(date)) throw new Error('Choose a valid travel date.');
  const query = new URLSearchParams({ from_station: from, to_station: to, page: String(page), limit: '20' });
  if (date) query.set('date', date);
  return query;
}
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${PASSENGER_API}/${path}`, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(response.status === 404 ? 'No railway record was found for this search or journey date.' : 'Railway information is unavailable. Please try again.');
  const data = await response.json();
  if (!['live', 'cached', 'database'].includes(data?.data_source)) throw new Error('Verified railway data is unavailable.');
  return data as T;
}
export async function stations(query: string, signal?: AbortSignal): Promise<Station[]> {
  const data = await request<{ results: Station[] }>(`stations/search?${new URLSearchParams({ q: query.trim() })}`, signal);
  if (!Array.isArray(data.results) || data.results.some(s => !s.code || !s.name)) throw new Error('Station information is unavailable.');
  return data.results;
}
export async function lookup(query: string, signal?: AbortSignal): Promise<SearchTrain[]> {
  const data = await request<{ results: SearchTrain[] }>(`passenger/lookup?${new URLSearchParams({ q: query.trim() })}`, signal);
  if (!Array.isArray(data.results)) throw new Error('Train directory unavailable.');
  return data.results;
}
export async function routeSearch(from: string, to: string, date = '', page = 1, signal?: AbortSignal) {
  const data = await request<SearchPage>(`trains/search?${searchQuery(from, to, date, page)}`, signal);
  if (!Array.isArray(data.trains) || !Number.isFinite(data.total)) throw new Error('Route information is unavailable.');
  return data;
}
export async function loadJourney(number: string, date = '', signal?: AbortSignal): Promise<Journey> {
  if (!/^\d{5}$/.test(number)) throw new Error('Enter a five-digit train number.');
  if (date && !validDate(date)) throw new Error('Choose a valid journey start date.');
  const result: Journey = { status: null, eta: null };
  const check = (data: { train_number: string; date: string }, expectedDate: string) => {
    if (data.train_number !== number || (expectedDate && data.date !== expectedDate)) throw new Error('The response belongs to a different journey. Please refresh.');
  };
  try {
    const status = await request<Status>(`trains/${number}/status${date ? `?date=${date}` : ''}`, signal);
    check(status, date);
    if (!Array.isArray(status.route)) throw new Error('Route information is unavailable.');
    result.status = status;
  } catch (error) { result.statusError = error instanceof Error ? error.message : 'Train status unavailable.'; }
  if (signal?.aborted) return result;
  const journeyDate = date || result.status?.date || '';
  try {
    const eta = await request<ETA>(`trains/${number}/eta${journeyDate ? `?date=${journeyDate}` : ''}`, signal);
    check(eta, journeyDate);
    if (!Array.isArray(eta.remaining_stations)) throw new Error('ETA information is unavailable.');
    result.eta = eta;
  } catch (error) { result.etaError = error instanceof Error ? error.message : 'ETA unavailable.'; }
  return result;
}
export function passing(stop: Stop) {
  const a = stop.scheduled_arrival, d = stop.scheduled_departure;
  if (!a || !d) return false;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(a) && /^\d{2}:\d{2}(:\d{2})?$/.test(d)) return a.slice(0,5) === d.slice(0,5) && (a.slice(6) || '00') === (d.slice(6) || '00');
  return Number.isFinite(Date.parse(a)) && Date.parse(a) === Date.parse(d);
}
export function time(value?: string | null) {
  if (!value) return 'Unavailable';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return `${value.slice(0,5)} IST`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Unavailable' : parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST';
}
export function delayLabel(delay?: number | null) {
  return typeof delay !== 'number' || !Number.isFinite(delay) ? 'Difference unavailable' : delay > 0 ? `${delay} min later than scheduled` : delay < 0 ? `${Math.abs(delay)} min earlier than scheduled` : 'On schedule';
}
export function usablePrediction(eta: ETA | null, prediction?: Prediction) {
  return Boolean(eta && ['delay_adjusted', 'inference', 'stored'].includes(eta.prediction_method) && prediction?.predicted_arrival);
}
