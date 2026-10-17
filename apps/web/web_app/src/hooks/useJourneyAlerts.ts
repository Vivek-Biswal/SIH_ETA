'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadJourney, validDate } from '@/services/passenger';
import { ALERTS_KEY, CHECK_INTERVAL, WATCH_LIMIT, comparison, observation, parsePreferences, type Check, type Watch } from '@/services/journeyAlerts';
import { useLiveRefresh } from '@/services/preferences';

export function useJourneyAlerts() {
  const interval = useLiveRefresh();
  const [watches, setWatches] = useState<Watch[]>([]), [read, setRead] = useState<string[]>([]);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [busy, setBusy] = useState<string[]>([]), [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(''), [automatic, setAutomatic] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const watchesRef = useRef<Watch[]>([]), checksRef = useRef<Record<string, Check>>({});
  const requests = useRef(new Map<string, AbortController>());
  const nextCheck = useRef(new Map<string, number>()), failures = useRef(new Map<string, number>());
  const mounted = useRef(false);
  const replaceWatches = useCallback((value: Watch[]) => { watchesRef.current = value; setWatches(value); }, []);

  useEffect(() => {
    mounted.current = true;
    const hydrate = () => {
      try {
        const prefs = parsePreferences(localStorage.getItem(ALERTS_KEY));
        for (const [id, request] of requests.current) if (!prefs.watches.some(w => w.id === id)) request.abort();
        replaceWatches(prefs.watches); setRead(prefs.read);
      } catch { setStorageWarning('Saved alerts could not be read. Changes may only be kept in this tab.'); }
      setReady(true);
    };
    hydrate();
    const storage = (event: StorageEvent) => { if (event.key === ALERTS_KEY || event.key === null) hydrate(); };
    const clock = setInterval(() => setNow(Date.now()), 15000);
    window.addEventListener('storage', storage);
    return () => { mounted.current = false; clearInterval(clock); window.removeEventListener('storage', storage); requests.current.forEach(r => r.abort()); };
  }, [replaceWatches]);

  useEffect(() => {
    if (!ready) return;
    try {
      const value = JSON.stringify({ version: 1, watches, read });
      if (localStorage.getItem(ALERTS_KEY) !== value) localStorage.setItem(ALERTS_KEY, value);
    } catch { setStorageWarning('Browser storage is unavailable. Your changes are kept for this tab only.'); }
  }, [watches, read, ready]);

  const refresh = useCallback(async (watch: Watch) => {
    if (requests.current.has(watch.id) || Date.now() < (nextCheck.current.get(watch.id) || 0)) return;
    const controller = new AbortController(); requests.current.set(watch.id, controller);
    nextCheck.current.set(watch.id, Date.now() + CHECK_INTERVAL);
    setBusy(ids => [...ids, watch.id]); setNow(Date.now());
    try {
      const result = await loadJourney(watch.number, watch.date, controller.signal, true, { requireStatusForETA: true });
      if (controller.signal.aborted || !mounted.current || !watchesRef.current.some(w => w.id === watch.id)) return;
      const checkedAt = Date.now();
      const error = !result.status ? result.statusError || 'A current train report is unavailable.' : '';
      const old = checksRef.current[watch.id];
      const newObservation = observation(result.status, checkedAt);
      const oldObservation = old?.journey?.status?.last_known_location?.updated_at;
      const previous = newObservation && Date.parse(newObservation) > Date.parse(oldObservation || '')
        ? comparison(watch, old) : old?.previous;
      const check: Check = { journey: result.status ? result : old?.journey || null, checkedAt, error, previous };
      checksRef.current = { ...checksRef.current, [watch.id]: check }; setChecks(checksRef.current);
      const failed = !result.status || !newObservation || Boolean(result.etaError);
      const count = failed ? (failures.current.get(watch.id) || 0) + 1 : 0;
      failures.current.set(watch.id, count);
      nextCheck.current.set(watch.id, checkedAt + Math.min(900000, CHECK_INTERVAL * 2 ** Math.min(count, 3)));
      const resolved = result.status?.date;
      if (!watch.date && resolved && validDate(resolved)) replaceWatches(watchesRef.current.map(w => w.id === watch.id ? { ...w, date: resolved } : w));
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) {
        const old = checksRef.current[watch.id];
        checksRef.current = { ...checksRef.current, [watch.id]: { ...old, journey: old?.journey || null, checkedAt: Date.now(), error: error instanceof Error ? error.message : 'Could not check this journey.' } };
        setChecks(checksRef.current); nextCheck.current.set(watch.id, Date.now() + 300000);
      }
    } finally {
      if (requests.current.get(watch.id) === controller) requests.current.delete(watch.id);
      if (mounted.current) { setBusy(ids => ids.filter(id => id !== watch.id)); setNow(Date.now()); }
    }
  }, [replaceWatches]);

  const refreshAll = useCallback(() => {
    // Three explicit watches maximum; the backend shares status/ETA responses.
    for (const watch of watchesRef.current) void refresh(watch);
  }, [refresh]);
  useEffect(() => {
    if (!automatic || interval === 0) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refreshAll(); }, Math.max(CHECK_INTERVAL, interval));
    return () => clearInterval(timer);
  }, [automatic, interval, refreshAll]);

  function add(number: string, date: string, threshold: number) {
    if (!/^\d{5}$/.test(number)) return 'Enter a five-digit train number.';
    if (date && !validDate(date)) return 'Choose a valid journey start date.';
    if (![5, 15, 30, 60].includes(threshold)) return 'Choose a delay threshold from the list.';
    if (watchesRef.current.length >= WATCH_LIMIT) return `You can watch up to ${WATCH_LIMIT} journeys. Remove one to add another.`;
    if (watchesRef.current.some(w => w.number === number && (!date || !w.date || w.date === date))) return 'This train journey is already on your list. Choose a different start date for another journey.';
    const watch = { id: crypto.randomUUID(), number, date, threshold, station: '' };
    replaceWatches([...watchesRef.current, watch]); void refresh(watch); return '';
  }
  function remove(id: string) {
    requests.current.get(id)?.abort();
    replaceWatches(watchesRef.current.filter(w => w.id !== id));
    const remaining = { ...checksRef.current }; delete remaining[id]; checksRef.current = remaining; setChecks(remaining);
    nextCheck.current.delete(id); failures.current.delete(id);
  }
  function update(id: string, change: Pick<Watch, 'station'> | Pick<Watch, 'threshold'>) {
    replaceWatches(watchesRef.current.map(w => w.id === id ? { ...w, ...change } : w));
  }
  function markRead(ids: string[]) { setRead(previous => [...new Set([...previous, ...ids])].slice(-200)); }
  const canRefresh = (id: string) => !busy.includes(id) && now >= (nextCheck.current.get(id) || 0);
  const nextAllowedAt = (id: string) => nextCheck.current.get(id) || 0;
  return { watches, checks, read, ready, busy, now, storageWarning, automatic, setAutomatic, interval,
    add, remove, update, refresh, refreshAll, markRead, canRefresh, nextAllowedAt };
}
