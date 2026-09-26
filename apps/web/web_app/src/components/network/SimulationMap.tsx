'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { SimTrain, SimSegment } from '@/types/simulation';
import { SIM_STATIONS } from '@/hooks/useSimulation';

// ---- Icons ----
const createSimTrainIcon = (status: SimTrain['status'], isSelected: boolean) => {
  const color = status === 'CRITICAL' ? '#EF4444' : status === 'DELAYED' ? '#F59E0B' : '#10B981';
  const size  = isSelected ? 18 : 14;
  const glow  = isSelected ? `box-shadow:0 0 12px ${color};` : `box-shadow:0 0 6px ${color}80;`;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50%;
      border:2px solid white;
      ${glow}
      transition:all 0.2s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createStationIcon = (isBottleneck: boolean) => {
  const color = isBottleneck ? '#EF4444' : '#3B82F6';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:10px;height:10px;
      background:white;
      border-radius:50%;
      border:2.5px solid ${color};
      box-shadow:0 0 4px ${color}60;
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

// ---- Helpers ----
const segColor = (c: SimSegment['congestion']): string =>
  c === 'CRITICAL' ? '#EF4444' : c === 'MODERATE' ? '#F59E0B' : '#3B82F6';

const segWeight = (c: SimSegment['congestion']) =>
  c === 'CRITICAL' ? 5 : c === 'MODERATE' ? 4 : 2.5;

const segOpacity = (c: SimSegment['congestion']) =>
  c === 'CRITICAL' ? 1 : c === 'MODERATE' ? 0.9 : 0.7;

const segDash = (c: SimSegment['congestion']) =>
  c === 'MODERATE' ? '8 6' : undefined;

// ---- Props ----
interface SimMapProps {
  trains:     SimTrain[];
  segments:   SimSegment[];
  selectedId: string | null;
  onSelect:   (id: string | null) => void;
}

export default function SimulationMap({ trains, segments, selectedId, onSelect }: SimMapProps) {
  const { resolvedTheme } = useTheme();
  const mapTilerKey = process.env.MAPTILER_API_KEY || '';
  const tileUrl = resolvedTheme === 'dark'
    ? `https://api.maptiler.com/maps/basic-v2-dark/256/{z}/{x}/{y}.png?key=${mapTilerKey}`
    : `https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=${mapTilerKey}`;

  // Bottleneck stations
  const bottleneckStations = new Set(
    segments.filter((s) => s.isBottleneck).flatMap((s) => [s.from.code, s.to.code])
  );

  return (
    <div className="h-full w-full relative z-0 rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={[26.8, 78.0]}
        zoom={7}
        style={{ height: '100%', width: '100%', backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#f8fafc' }}
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution='&copy; MapTiler &copy; OpenStreetMap' />

        {/* Corridor segments — coloured by congestion */}
        {segments.map((seg) => {
          const positions: [number, number][] = [
            [seg.from.lat, seg.from.lng],
            [seg.to.lat,   seg.to.lng],
          ];
          return (
            <React.Fragment key={seg.id}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color:   segColor(seg.congestion),
                  weight:  segWeight(seg.congestion),
                  opacity: segOpacity(seg.congestion),
                  dashArray: segDash(seg.congestion),
                }}
              />
              {/* Bottleneck pulse ring */}
              {seg.isBottleneck && (
                <CircleMarker
                  center={[
                    (seg.from.lat + seg.to.lat) / 2,
                    (seg.from.lng + seg.to.lng) / 2,
                  ]}
                  radius={18}
                  pathOptions={{ color: '#EF4444', weight: 2, opacity: 0.6, fill: false, dashArray: '4 4' }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Station markers */}
        {SIM_STATIONS.map((st) => {
          const isHot = bottleneckStations.has(st.code);
          return (
            <Marker
              key={st.code}
              position={[st.lat, st.lng]}
              icon={createStationIcon(isHot)}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.92} permanent={false}>
                <span className="text-xs font-semibold">{st.name}</span>
                {isHot && <span className="text-red-500 ml-1">⚠ BOTTLENECK</span>}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Simulated train markers */}
        {trains.map((train) => {
          const isSelected = train.id === selectedId;
          return (
            <Marker
              key={train.id}
              position={[train.lat, train.lng]}
              icon={createSimTrainIcon(train.status, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(isSelected ? null : train.id) }}
            >
              <Popup closeButton={false} className="train-selected-popup">
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>
                    {train.id} · <span style={{ color: '#94a3b8', fontSize: 10 }}>SIMULATION</span>
                  </div>
                  <div style={{ fontSize: 11 }}>{train.name}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    Speed: {Math.round(train.speedKmh)} km/h<br />
                    Delay: {train.delayMinutes > 0 ? `${Math.round(train.delayMinutes)} min` : 'On Time'}<br />
                    Section: {train.fromStation.code} → {train.toStation.code}
                  </div>
                  <div style={{ fontSize: 10, marginTop: 4, color: '#64748b', borderTop: '1px solid #334155', paddingTop: 4 }}>
                    source: simulation · not RailRadar live
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* SIMULATION MODE overlay badge */}
      <div className="absolute top-3 left-3 z-[500] flex items-center gap-1.5 bg-amber-500/90 text-black text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg pointer-events-none select-none">
        <span className="w-2 h-2 rounded-full bg-black/60 animate-pulse inline-block" />
        SIMULATION MODE
      </div>
    </div>
  );
}
