'use client';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, CircleMarker, Popup, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrainStatus } from '@/types/api';
import { coordinates } from '@/services/routeGeometry';
import { MapTiles } from './MapTiles';
import type { TrainRoutePoint } from './MapWrapper';

const trainIcon = L.divIcon({ className: '', html: '<div style="background:#1d4ed8;border:3px solid white;border-radius:12px;padding:7px;box-shadow:0 3px 12px #0005;color:white;font-size:22px">🚆</div>', iconSize: [44, 44], iconAnchor: [22, 22] });
function TrainMarker({ train, point, fresh, stationOnly }: { train: TrainStatus; point: [number, number]; fresh: boolean; stationOnly: boolean }) {
  const marker = useRef<L.Marker>(null);
  const previous = useRef(point);
  const [lat, lng] = point;
  useEffect(() => {
    const start = previous.current;
    let frame = 0;
    const began = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function animate(now: number) {
      const fraction = !fresh || stationOnly || reduced || document.hidden ? 1 : Math.min((now - began) / 1500, 1);
      const position: [number, number] = [start[0] + (lat - start[0]) * fraction, start[1] + (lng - start[1]) * fraction];
      marker.current?.setLatLng(position); previous.current = position;
      if (fraction < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [lat, lng, fresh, stationOnly]);
  return <Marker ref={marker} position={previous.current} icon={trainIcon} zIndexOffset={1000}><Tooltip direction="top" offset={[0, -22]} permanent>{train.train_number} · {stationOnly ? 'Last reported station' : !fresh ? 'Older position' : train.last_known_location?.position_source === 'telemetry_derived' ? 'Estimated position' : 'Reported position'}</Tooltip><Popup>{train.train_name}<br />Updated: {train.last_known_location?.updated_at || 'Time unavailable'}</Popup></Marker>;
}
function ViewControls({ route, point }: { route: TrainRoutePoint[]; point: [number, number] | null }) {
  const map = useMap();
  const [follow, setFollow] = useState(false);
  const signature = route.map(p => p.latitude + ',' + p.longitude).join(';');
  useEffect(() => {
    if (!signature) return;
    const points = signature.split(';').map(pair => pair.split(',').map(Number) as [number, number]);
    map.fitBounds(points, { padding: [48, 48], maxZoom: 10 });
  }, [map, signature]);
  const lat = point?.[0], lng = point?.[1];
  useEffect(() => { if (follow && lat !== undefined && lng !== undefined) map.panTo([lat, lng]); }, [map, follow, lat, lng]);
  useEffect(() => { const stop = () => setFollow(false); map.on('dragstart', stop); return () => { map.off('dragstart', stop); }; }, [map]);
  return <div className="absolute left-14 top-16 sm:top-3 z-[900] flex gap-2">
    <button disabled={!route.length} className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow disabled:opacity-50" onClick={() => { setFollow(false); map.fitBounds(route.map(p => [p.latitude, p.longitude] as [number, number]), { padding: [48, 48], maxZoom: 10 }); }}>Fit route</button>
    <button disabled={!point} aria-pressed={follow} className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow disabled:opacity-50" onClick={() => setFollow(value => !value)}>{follow ? 'Following train' : 'Follow train'}</button>
  </div>;
}
export default function NetworkMap({ trains, selectedTrainId, route = [], routeLoading = false }: { trains: TrainStatus[]; onSelectTrain: (train: TrainStatus | null) => void; selectedTrainId: string | null; route?: TrainRoutePoint[]; routeLoading?: boolean }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const train = trains.find(item => item.train_number === selectedTrainId);
  const location = train?.last_known_location;
  const observed = location?.updated_at ? Date.parse(location.updated_at) : NaN;
  const fresh = train?.data_source === 'live' && now - observed >= 0 && now - observed <= 300000;
  const telemetry = coordinates(location?.latitude, location?.longitude);
  const station = route.find(point => point.current);
  const position = telemetry || station;
  const point: [number, number] | null = position ? [position.latitude, position.longitude] : null;
  return <div className="relative h-full isolate">
    <MapContainer center={[23, 79]} zoom={5} style={{ height: '100%', width: '100%' }}>
      <MapTiles /><ViewControls route={route} point={point} />
      {route.slice(1).map((stop, index) => {
        const start = route[index];
        // Missing station geography creates a visible gap, not an invented shortcut.
        return stop.sequence === start.sequence + 1 ? <Polyline key={stop.sequence} positions={[[start.latitude, start.longitude], [stop.latitude, stop.longitude]]} pathOptions={{ color: '#2563eb', weight: 4, dashArray: '8 6', opacity: .85 }} /> : null;
      })}
      {route.map(stop => <CircleMarker key={stop.sequence} center={[stop.latitude, stop.longitude]} radius={stop.current ? 7 : 5} pathOptions={{ color: '#fff', fillColor: stop.passed ? '#64748b' : '#2563eb', fillOpacity: 1, weight: 2 }}><Popup><strong>{stop.name} · {stop.code}</strong><p>{stop.current ? 'Last reported station' : stop.next ? 'Next station' : stop.passed ? 'Passed' : 'Route stop'}</p></Popup></CircleMarker>)}
      {train && point && <TrainMarker train={train} point={point} fresh={Boolean(fresh)} stationOnly={!telemetry} />}
    </MapContainer>
    <p role="status" className="absolute bottom-20 left-3 z-[500] max-w-[75%] rounded-xl bg-card/95 border border-border px-3 py-2 text-xs shadow">{routeLoading ? 'Loading station locations…' : !route.length ? 'Route geography unavailable. See station list below.' : !point ? 'Route shown · current position unavailable' : !fresh ? 'Last available position · waiting for a fresh update' : !telemetry ? 'Latest reported station · exact position unavailable' : 'Position updates when new observations arrive'}</p>
  </div>;
}
