'use client';
import { useEffect } from 'react';
import { MapContainer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TrainStatus } from '@/types/api';
import { MapTiles } from './MapTiles';
import type { TrainRoutePoint } from './MapWrapper';
function Follow({ trains, selected }: { trains: TrainStatus[]; selected: string | null }) {
  const map = useMap();
  useEffect(() => {
    const p = trains.find(t => t.train_number === selected)?.last_known_location;
    if (p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) map.setView([p.latitude!, p.longitude!], 9);
  }, [map, selected, trains]);
  return null;
}
function RouteViewport({ route, enabled }: { route: TrainRoutePoint[]; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || route.length < 2) return;
    map.fitBounds(route.map(point => [point.latitude, point.longitude] as [number, number]), { padding: [36, 36], maxZoom: 7 });
  }, [enabled, map, route]);
  return null;
}
export default function NetworkMap({ trains, onSelectTrain, selectedTrainId, route = [], routeLoading = false }: { trains: TrainStatus[]; onSelectTrain: (train: TrainStatus | null) => void; selectedTrainId: string | null; route?: TrainRoutePoint[]; routeLoading?: boolean }) {
  const located = trains.filter(t => {
    const p = t.last_known_location;
    return p && typeof p.latitude === 'number' && typeof p.longitude === 'number' && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180 && ['live', 'cached', 'database'].includes(t.data_source || '');
  });
  const routeLine = route
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map(point => [point.latitude, point.longitude] as [number, number]);
  return <div className="relative h-full isolate">
    <MapContainer center={[23, 79]} zoom={5} style={{ height: '100%', width: '100%' }}>
      <MapTiles /><Follow trains={located} selected={selectedTrainId} /><RouteViewport route={route} enabled={!located.length} />
      {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }} />}
      {route.map(point => <CircleMarker key={`${point.code}-${point.sequence}`} center={[point.latitude, point.longitude]} radius={point.current ? 8 : point.next ? 7 : 5} pathOptions={{ color: point.current ? '#fff' : '#1d4ed8', fillColor: point.current ? '#f59e0b' : point.passed ? '#64748b' : '#22c55e', fillOpacity: 1, weight: point.current ? 3 : 2 }}>
        <Popup><strong>{point.code} · {point.name}</strong><p>{point.current ? `${selectedTrainId || 'Train'} reported here` : point.next ? 'Next scheduled station' : point.passed ? 'Passed station' : 'Scheduled route stop'}</p></Popup>
      </CircleMarker>)}
      {located.map(train => <CircleMarker key={train.train_number} center={[train.last_known_location!.latitude!, train.last_known_location!.longitude!]} radius={9} pathOptions={{ color: '#fff', fillColor: train.delay_minutes > 0 ? '#f59e0b' : '#2563eb', fillOpacity: 1, weight: 2 }} eventHandlers={{ click: () => onSelectTrain(train) }}>
        <Popup><strong>{train.train_number} · {train.train_name}</strong><p>{train.last_known_location?.position_source || 'Position source unspecified'}</p><p>Observation: {train.last_known_location?.updated_at || 'Unavailable'}</p></Popup>
      </CircleMarker>)}
    </MapContainer>
    {route.length > 1 && <div className="absolute bottom-3 left-3 z-[500] rounded-xl bg-card/95 border border-border px-3 py-2 text-xs shadow flex items-center gap-3"><span className="inline-flex items-center gap-1"><i className="h-1.5 w-7 rounded-full bg-blue-600" /> Train route</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Current</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-green-500" /> Upcoming</span></div>}
    {routeLoading && <p className="absolute top-3 left-14 right-3 z-[500] rounded-xl bg-card/95 border border-border p-3 text-sm shadow">Loading the train’s station route…</p>}
    {!routeLoading && !located.length && !route.length && <p className="absolute top-3 left-14 right-3 z-[500] rounded-xl bg-card/95 border border-border p-3 text-sm shadow">No verified train coordinates or mapped station route are available. Train status and arrival information remain accessible below.</p>}
    {!routeLoading && !located.length && route.length > 1 && <p className="absolute top-3 left-14 right-3 z-[500] rounded-xl bg-card/95 border border-border p-3 text-sm shadow">Route shown from verified station geography. The provider has not supplied a current train coordinate yet.</p>}
  </div>;
}
