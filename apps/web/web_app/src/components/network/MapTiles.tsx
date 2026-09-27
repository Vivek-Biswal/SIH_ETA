'use client';

import { useEffect, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import { MAP_STYLES, validateMapStyle, type MapStyle } from '@/services/mapStyle';

const OPEN_STREET_MAP = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export function MapTiles() {
  const map = useMap();
  const [style, setStyle] = useState<MapStyle>('hybrid-v4');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [fallback, setFallback] = useState(false);
  const [attempt, retry] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    setUrl('');
    setError('');
    setFallback(false);

    async function load() {
      const response = await fetch('/api/maps/config', { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Geographic map unavailable: MapTiler is not configured.');
      const data = await response.json();
      if (typeof data.key !== 'string' || !data.key.trim()) throw new Error('The map key is missing.');
      setUrl(await validateMapStyle(data.key.trim(), style, signal));
    }

    load().catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      const message = cause instanceof Error && cause.name === 'TimeoutError'
        ? 'MapTiler timed out. Showing OpenStreetMap fallback.'
        : `${cause instanceof Error ? cause.message : 'MapTiler failed.'} Showing OpenStreetMap fallback.`;
      setFallback(true);
      setUrl(OPEN_STREET_MAP);
      setError(message);
    });
    return () => controller.abort();
  }, [style, attempt]);

  useEffect(() => {
    const element = map.getContainer().parentElement;
    if (!element || !expanded) return;
    const original = element.getAttribute('style');
    element.style.cssText += ';position:fixed;inset:0;z-index:1000;height:100dvh;width:100vw;border-radius:0;';
    map.invalidateSize();
    return () => {
      if (original === null) element.removeAttribute('style');
      else element.setAttribute('style', original);
      map.invalidateSize();
    };
  }, [map, expanded]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    if (expanded) window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [expanded]);

  const onTileError = () => {
    if (fallback) return;
    setFallback(true);
    setUrl(OPEN_STREET_MAP);
    setError('MapTiler tiles could not load. Showing OpenStreetMap fallback.');
  };

  return (
    <>
      {url && (
        <TileLayer
          key={`${url}-${attempt}`}
          url={url}
          maxZoom={19}
          attribution={fallback
            ? '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'
            : '<a href="https://www.maptiler.com/copyright/">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'}
          eventHandlers={{ tileerror: onTileError }}
        />
      )}
      <div
        className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 rounded-xl border border-border bg-card p-2 text-foreground shadow-lg"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <label className="text-xs font-semibold">
          Map layer
          <select aria-label="Map layer" value={style} onChange={(event) => setStyle(event.target.value as MapStyle)} className="block mt-1 rounded-lg border border-border bg-background p-2 text-sm">
            {MAP_STYLES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <button className="rounded-lg p-2 text-xs hover:bg-muted" onClick={() => map.fitBounds([[6.5, 68], [37, 97.5]])}>Focus India</button>
        <button aria-pressed={expanded} className="rounded-lg p-2 text-xs hover:bg-muted" onClick={() => setExpanded(value => !value)}>{expanded ? 'Exit full screen' : 'Full screen'}</button>
      </div>
      {(error || !url) && <div role={error ? 'alert' : 'status'} className="absolute bottom-8 left-3 right-3 z-[1000] rounded-xl border border-border bg-card p-4 text-sm text-foreground shadow-lg">{error || 'Connecting to geographic map…'}{error && <button className="ml-3 underline" onClick={() => retry(value => value + 1)}>Retry MapTiler</button>}</div>}
    </>
  );
}
