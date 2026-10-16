'use client';
import { useSyncExternalStore } from 'react';

export const REFRESH_KEY = 'etaernal_live_refresh';
const CHANGE_EVENT = 'etaernal-preferences-changed';
export type RefreshInterval = 120000 | 300000 | 0;
export function parseRefreshInterval(value: string | null): RefreshInterval {
  return value === '0' ? 0 : value === '300000' ? 300000 : 120000;
}
function snapshot(): RefreshInterval {
  try { return parseRefreshInterval(window.localStorage.getItem(REFRESH_KEY)); }
  catch { return 120000; }
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => { if (!event.key || event.key === REFRESH_KEY) listener(); };
  window.addEventListener('storage', storage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(CHANGE_EVENT, listener); };
}
export function useLiveRefresh() {
  return useSyncExternalStore(subscribe, snapshot, () => 120000 as RefreshInterval);
}
export function saveLiveRefresh(interval: RefreshInterval): boolean {
  try {
    window.localStorage.setItem(REFRESH_KEY, String(parseRefreshInterval(String(interval))));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch { return false; }
}
export function refreshDescription(interval: RefreshInterval): string {
  return interval === 0 ? 'Automatic checks are off. Use Refresh to check for a new update.'
    : `Checks for updates every ${interval / 60000} minutes while visible, with longer waits after errors.`;
}
