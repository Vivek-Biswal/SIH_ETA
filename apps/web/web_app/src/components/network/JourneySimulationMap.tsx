'use client';
import { Fragment, useEffect } from 'react';
import { MapContainer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapTiles } from './MapTiles';
import type { RoutePoint } from '@/services/routeGeometry';

function Fit({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  const fit = () => { if (points.length) map.fitBounds(points.map(p => [p.latitude, p.longitude]), { padding: [40, 60], maxZoom: 10 }); };
  useEffect(fit, [map, points]); // Reframe only when a different route is loaded.
  return <button onClick={fit} className="absolute bottom-16 left-3 z-[500] rounded-lg bg-background p-3 shadow">Fit entire route</button>;
}
export default function JourneySimulationMap({ points, index, progress, affected }: { points: RoutePoint[]; index: number; progress: number; affected?: number }) {
  const from = points.find(p => p.sequence === index);
  const to = points.find(p => p.sequence === index + 1);
  const location: [number, number] | null = from && to ? [from.latitude + (to.latitude - from.latitude) * progress, from.longitude + (to.longitude - from.longitude) * progress] : from && progress === 1 ? [from.latitude, from.longitude] : null;
  return <MapContainer center={[22, 79]} zoom={5} className="h-full w-full">
    <MapTiles /><Fit points={points} />
    {points.map((point, i) => {
      const next = points[i + 1];
      return <Fragment key={point.sequence}><CircleMarker center={[point.latitude, point.longitude]} radius={4} pathOptions={{ color: point.sequence <= index ? '#64748b' : '#2563eb' }}><Tooltip>{point.name} · stop {point.sequence + 1}</Tooltip></CircleMarker>{next && next.sequence === point.sequence + 1 && <Polyline positions={[[point.latitude, point.longitude], [next.latitude, next.longitude]]} pathOptions={{ color: affected === point.sequence ? '#ef4444' : point.sequence < index ? '#94a3b8' : '#2563eb', weight: 4, dashArray: '7 5' }} />}</Fragment>;
    })}
    {location && <CircleMarker center={location} radius={10} pathOptions={{ color: '#fff', fillColor: '#059669', fillOpacity: 1, weight: 3 }}><Tooltip permanent>Simulated train</Tooltip></CircleMarker>}
    {!location && <div className="absolute top-3 left-14 right-24 z-[500] rounded-lg bg-background p-2 text-xs">Position cannot be drawn on this section: station coordinates are missing. Progress remains available below.</div>}
  </MapContainer>;
}
