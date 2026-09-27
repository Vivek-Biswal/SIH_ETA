export type MapStyle = 'hybrid-v4' | 'streets-v4' | 'outdoor-v4';
export const MAP_STYLES: { id: MapStyle; label: string }[] = [
  { id: 'hybrid-v4', label: 'Satellite' },
  { id: 'streets-v4', label: 'Streets' },
  { id: 'outdoor-v4', label: 'Terrain' },
];

export async function validateMapStyle(key: string, style: MapStyle, signal: AbortSignal) {
  const response = await fetch(`https://api.maptiler.com/maps/${style}/256/tiles.json?key=${encodeURIComponent(key)}`, { signal, cache: 'no-store' });
  if (response.status === 401 || response.status === 403) throw new Error('MapTiler rejected the map key or domain. The site owner must authorize this website in MapTiler and update the Vercel map key.');
  if (!response.ok) throw new Error('This map layer is unavailable. Try another layer or retry.');
  const data = await response.json();
  if (!Array.isArray(data.tiles) || !data.tiles.length) throw new Error('The map provider returned an invalid layer.');
  const template = String(data.tiles[0]);
  return template.includes('{z}') ? template.replace('{?key}', `?key=${encodeURIComponent(key)}`) : `https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
}
