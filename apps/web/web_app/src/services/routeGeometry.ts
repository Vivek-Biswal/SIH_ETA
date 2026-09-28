import { stationDetails, type Status } from './passenger';

export type RoutePoint = { code: string; name: string; latitude: number; longitude: number; sequence: number; current?: boolean; next?: boolean; passed?: boolean };
type Geography = Pick<RoutePoint, 'latitude' | 'longitude'>;
const cache = new Map<string, { point: Geography; expires: number }>();
const retryAfter = new Map<string, number>();
let directory: Promise<Record<string, [number, number]>> | undefined;
function stationDirectory(): Promise<Record<string, [number, number]>> {
  return directory ??= fetch('/station-geography.json', { cache: 'force-cache', signal: AbortSignal.timeout(10000) })
    .then(response => { if (!response.ok) throw new Error('Directory unavailable'); return response.json() as Promise<Record<string, [number, number]>>; })
    .catch(() => { directory = undefined; return {} as Record<string, [number, number]>; });
}

export function coordinates(latitude: unknown, longitude: unknown): Geography | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export async function resolveRoute(status: Status, signal: AbortSignal): Promise<RoutePoint[]> {
  const directory = await stationDirectory();
  const geography = new Map<string, Geography>();
  for (const stop of status.route) {
    const station = stop.station;
    if (!station) continue;
    const saved = directory[station.code.toUpperCase()];
    const point = coordinates(station.latitude, station.longitude) || (saved ? coordinates(saved[0], saved[1]) : null);
    if (point) geography.set(station.code.toUpperCase(), point);
  }
  const codes = [...new Set(status.route.flatMap(stop => stop.station ? [stop.station.code.toUpperCase()] : []))];
  let cursor = 0;
  // Four concurrent requests at most; failures are deliberately not cached.
  await Promise.all(Array.from({ length: Math.min(4, codes.length) }, async () => {
    while (cursor < codes.length && !signal.aborted) {
      const code = codes[cursor++];
      if (geography.has(code)) continue;
      const saved = cache.get(code);
      if (saved && saved.expires > Date.now()) { geography.set(code, saved.point); continue; }
      if ((retryAfter.get(code) || 0) > Date.now()) continue;
      try {
        const detail = await stationDetails(code, signal);
        const point = coordinates(detail.latitude, detail.longitude);
        if (point && !signal.aborted) {
          geography.set(code, point);
          if (cache.size >= 2000) cache.delete(cache.keys().next().value!);
          cache.set(code, { point, expires: Date.now() + 86400000 });
          retryAfter.delete(code);
        } else if (!signal.aborted) {
          retryAfter.set(code, Date.now() + 300000);
        }
      } catch {
        if (!signal.aborted) {
          if (retryAfter.size >= 2000) retryAfter.delete(retryAfter.keys().next().value!);
          retryAfter.set(code, Date.now() + 300000);
        }
      }
    }
  }));
  // A repeated station code cannot identify the current visit unambiguously.
  const matches = status.route.flatMap((stop, index) => stop.station?.code === status.current_station?.code ? [index] : []);
  const current = matches.length === 1 ? matches[0] : -1;
  return status.route.flatMap((stop, sequence) => {
    const station = stop.station;
    const point = station && geography.get(station.code.toUpperCase());
    return station && point ? [{ ...point, code: station.code, name: station.name, sequence, current: sequence === current, next: current >= 0 && sequence === current + 1, passed: Boolean(stop.has_departed) || (current >= 0 && sequence < current) }] : [];
  });
}
