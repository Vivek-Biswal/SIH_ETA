'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { NetworkWorkspace } from './NetworkWorkspace';
import { parseJourneyMode, type JourneyMode } from '@/services/journeyWorkspace';

function notifyNavigation() {
  (window as Window & { JourneyNavigation?: { postMessage: (value: string) => void } }).JourneyNavigation?.postMessage('changed');
}

/** App-only presentation. Mode changes become real WebView history entries. */
export function MobileJourneyWorkspace({ initialMode = 'live', theme }: { initialMode?: JourneyMode; theme?: 'dark' | 'light' }) {
  const [mode, setMode] = useState(initialMode);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (theme) setTheme(theme);
    const changeTheme = (event: Event) => {
      const value = (event as CustomEvent<unknown>).detail;
      if (value === 'dark' || value === 'light') setTheme(value);
    };
    window.addEventListener('journey-theme', changeTheme);
    return () => window.removeEventListener('journey-theme', changeTheme);
  }, [setTheme, theme]);

  useEffect(() => {
    const restoreMode = () => {
      setMode(parseJourneyMode(new URL(window.location.href).searchParams.get('mode')));
      notifyNavigation();
    };
    window.addEventListener('popstate', restoreMode);
    notifyNavigation();
    return () => window.removeEventListener('popstate', restoreMode);
  }, []);

  function selectMode(next: JourneyMode) {
    if (next === mode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('mode', next);
    // Preserve Next's router state; query-only entries avoid a route/API reload.
    window.history.pushState(window.history.state, '', url);
    setMode(next);
    notifyNavigation();
  }

  return <NetworkWorkspace embedded activeMode={mode} onModeChange={selectMode} />;
}
