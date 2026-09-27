'use client';
import { useEffect } from 'react';
import { MapContainer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TrainStatus } from '@/types/api';
import { MapTiles } from './MapTiles';
function Follow({ trains, selected }: { trains: TrainStatus[]; selected: string | null }) {
  const map = useMap();
  useEffect(() => {
    const p = trains.find(t => t.train_number === selected)?.last_known_location;
    if (p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) map.setView([p.latitude!, p.longitude!], 9);
  }, [map, selected, trains]);
  return null;
}
export default function NetworkMap({ trains, onSelectTrain, selectedTrainId }: { trains: TrainStatus[]; onSelectTrain: (train: TrainStatus | null) => void; selectedTrainId: string | null }) {
  const located = trains.filter(t => {
    const p = t.last_known_location;
    return p && typeof p.latitude === 'number' && typeof p.longitude === 'number' && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180 && ['live', 'cached', 'database'].includes(t.data_source || '');
  });
  return <div className="relative h-full isolate">
    <MapContainer center={[23, 79]} zoom={5} style={{ height: '100%', width: '100%' }}>
      <MapTiles /><Follow trains={located} selected={selectedTrainId} />
      {located.map(train => <CircleMarker key={train.train_number} center={[train.last_known_location!.latitude!, train.last_known_location!.longitude!]} radius={9} pathOptions={{ color: '#fff', fillColor: train.delay_minutes > 0 ? '#f59e0b' : '#2563eb', fillOpacity: 1, weight: 2 }} eventHandlers={{ click: () => onSelectTrain(train) }}>
        <Popup><strong>{train.train_number} · {train.train_name}</strong><p>{train.last_known_location?.position_source || 'Position source unspecified'}</p><p>Observation: {train.last_known_location?.updated_at || 'Unavailable'}</p></Popup>
      </CircleMarker>)}
    </MapContainer>
    {!located.length && <p className="absolute top-3 left-14 right-3 z-[500] rounded-xl bg-card/95 border border-border p-3 text-sm shadow">No verified train coordinates available. Train status and arrival information remain accessible below.</p>}
  </div>;
}
