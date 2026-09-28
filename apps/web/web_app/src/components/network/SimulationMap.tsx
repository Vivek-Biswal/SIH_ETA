'use client';

import React from 'react';
import { MapContainer, Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { SimTrain, SimSegment } from '@/types/simulation';
import { SIM_STATIONS } from '@/hooks/useSimulation';
import { MapTiles } from './MapTiles';

// ---- Icons ----
const createSimTrainIcon = (status: SimTrain['status'], isSelected: boolean, dimmed: boolean) => {
  const color = status === 'CRITICAL' ? '#EF4444' : status === 'DELAYED' ? '#F59E0B' : '#10B981';
  const size  = isSelected ? 22 : 14;
  const glow  = isSelected ? `box-shadow:0 0 14px ${color};` : `box-shadow:0 0 6px ${color}80;`;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50%;
      border:2px solid white;
      opacity:${dimmed ? 0.28 : 1};
      ${glow}
      transition:all 0.2s;
    ">${isSelected ? '<span style="display:block;width:6px;height:6px;background:white;border-radius:50%;margin:6px auto"></span>' : ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createStationIcon = (kind: 'current' | 'upcoming' | 'past' | 'disruption') => {
  const color = kind === 'disruption' ? '#EF4444' : kind === 'current' ? '#2563EB' : kind === 'past' ? '#94A3B8' : '#10B981';
  const size = kind === 'current' || kind === 'disruption' ? 14 : 10;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${kind === 'past' ? '#E2E8F0' : 'white'};
      border-radius:50%;
      border:2.5px solid ${color};
      box-shadow:0 0 4px ${color}60;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
  disruptionSegmentId?: string;
  disruptionStationCode?: string;
}

function MapViewportControls({ trains, selectedId }: { trains: SimTrain[]; selectedId: string | null }) {
  const map = useMap();
  const fitRoute = () => map.fitBounds(L.latLngBounds(SIM_STATIONS.map((station) => [station.lat, station.lng] as [number, number])), { padding: [28, 28] });
  const followTrain = () => {
    const train = trains.find((candidate) => candidate.id === selectedId);
    if (train) map.flyTo([train.lat, train.lng], Math.max(map.getZoom(), 8), { duration: 0.6 });
  };
  return <div className="absolute right-3 top-3 z-[500] flex flex-col gap-1 rounded-xl border border-slate-700/30 bg-slate-950/90 p-1 shadow-lg">
    <button onClick={fitRoute} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/10">Fit route</button>
    <button onClick={followTrain} disabled={!selectedId} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-blue-200 transition hover:bg-white/10 disabled:opacity-40">Follow train</button>
  </div>;
}

export default function SimulationMap({ trains, segments, selectedId, onSelect, disruptionSegmentId, disruptionStationCode }: SimMapProps) {
  const { resolvedTheme } = useTheme();
  const selectedTrain = trains.find((train) => train.id === selectedId);
  const selectedStart = selectedTrain ? segments.findIndex((segment) => segment.id === selectedTrain.segmentId) : -1;

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
        zoomControl={true}
      >
        <MapTiles />
        <MapViewportControls trains={trains} selectedId={selectedId} />

        {/* Corridor segments — coloured by congestion */}
        {segments.map((seg, index) => {
          const positions: [number, number][] = [
            [seg.from.lat, seg.from.lng],
            [seg.to.lat,   seg.to.lng],
          ];
          const isSelectedRoute = selectedStart < 0 || index >= selectedStart;
          const isCurrent = selectedTrain?.segmentId === seg.id;
          const isDisruption = seg.id === disruptionSegmentId || seg.isBottleneck;
          return (
            <React.Fragment key={seg.id}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color:   isDisruption ? '#EF4444' : isCurrent ? '#2563EB' : segColor(seg.congestion),
                  weight:  isCurrent ? 6 : isDisruption ? 5 : segWeight(seg.congestion),
                  opacity: isSelectedRoute ? (isCurrent || isDisruption ? 1 : 0.85) : 0.18,
                  dashArray: segDash(seg.congestion),
                }}
              />
              {/* Bottleneck pulse ring */}
              {isDisruption && (
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
          const isHot = bottleneckStations.has(st.code) || st.code === disruptionStationCode;
          const currentIndex = selectedTrain ? SIM_STATIONS.findIndex((station) => station.code === selectedTrain.fromStation.code) : -1;
          const stationIndex = SIM_STATIONS.findIndex((station) => station.code === st.code);
          const kind = isHot ? 'disruption' : stationIndex === currentIndex ? 'current' : stationIndex < currentIndex ? 'past' : 'upcoming';
          return (
            <Marker
              key={st.code}
              position={[st.lat, st.lng]}
              icon={createStationIcon(kind)}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.92} permanent={false}>
                <span className="text-xs font-semibold">{st.name}</span>
                {isHot && <span className="text-red-500 ml-1">⚠ DISRUPTION</span>}
                {kind === 'current' && <span className="text-blue-500 ml-1">· TRAIN HERE</span>}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Simulated train markers */}
        {trains.map((train) => {
          const isSelected = train.id === selectedId;
          const isDimmed = Boolean(selectedId) && !isSelected;
          return (
            <Marker
              key={train.id}
              position={[train.lat, train.lng]}
              icon={createSimTrainIcon(train.status, isSelected, isDimmed)}
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
      <div className="absolute top-3 left-14 z-[500] flex items-center gap-1.5 bg-amber-500/90 text-black text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg pointer-events-none select-none">
        <span className="w-2 h-2 rounded-full bg-black/60 animate-pulse inline-block" />
        SIMULATION MODE
      </div>
    </div>
  );
}
