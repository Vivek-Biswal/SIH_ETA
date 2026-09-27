'use client';
import { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { useTheme } from 'next-themes';

export function MapTiles() {
  const { resolvedTheme } = useTheme();
  const [key, setKey] = useState(''), [error, setError] = useState(''), [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch('/api/maps/config', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Geographic map unavailable: MapTiler is not configured.');
      const data = await response.json();
      setKey(data.key);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [attempt]);
  return <>
    {key && <TileLayer key={`${resolvedTheme}-${attempt}`} url={`https://api.maptiler.com/maps/${resolvedTheme === 'dark' ? 'basic-v2-dark' : 'basic-v2'}/256/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`} maxZoom={19}
      attribution='<a href="https://www.maptiler.com/copyright/">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'
      eventHandlers={{ tileerror: () => setError('Map tiles could not load. Check your connection or MapTiler domain access.') }} />}
    {(error || !key) && <div role="status" className="absolute bottom-8 left-3 right-3 z-[1000] rounded-xl border border-border bg-card p-3 text-sm shadow-lg">{error || 'Loading geographic map…'}{error && <button className="ml-3 underline" onClick={() => retry(n => n + 1)}>Retry map</button>}</div>}
  </>;
}
