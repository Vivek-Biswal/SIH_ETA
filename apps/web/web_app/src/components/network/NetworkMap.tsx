'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { TrainStatus } from '@/types/api';

// Create custom icons for trains
const createTrainIcon = (status: string) => {
  const color = status === 'CRITICAL' ? '#EF4444' : status === 'DELAYED' ? '#F59E0B' : '#10B981';
  
  return L.divIcon({
    className: 'custom-train-marker',
    html: `<div style="
      width: 14px; 
      height: 14px; 
      background-color: ${color}; 
      border-radius: 50%; 
      border: 2px solid white;
      box-shadow: 0 0 8px ${color}80;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const createStationIcon = () => {
  return L.divIcon({
    className: 'custom-station-marker',
    html: `<div style="
      width: 10px; 
      height: 10px; 
      background-color: white; 
      border-radius: 50%; 
      border: 2px solid #3B82F6;
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
};

interface NetworkMapProps {
  trains: TrainStatus[];
  onSelectTrain: (train: TrainStatus | null) => void;
  selectedTrainId: string | null;
}

// Mock stations for demo purposes
const stations = [
  { id: 'NDLS', name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
  { id: 'MTJ', name: 'Mathura Junction', lat: 27.4924, lng: 77.6737 },
  { id: 'AGC', name: 'Agra Cantt', lat: 27.1767, lng: 78.0081 },
  { id: 'GWL', name: 'Gwalior', lat: 26.2183, lng: 78.1828 },
  { id: 'BPL', name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  { id: 'CSMT', name: 'Mumbai CSMT', lat: 18.9398, lng: 72.8354 },
];

// Map bounds controller to automatically fit or follow train
const MapController = ({ 
  selectedTrainId, 
  trains 
}: { 
  selectedTrainId: string | null; 
  trains: TrainStatus[] 
}) => {
  const map = useMap();

  useEffect(() => {
    if (selectedTrainId) {
      const selectedTrain = trains.find(t => t.train_number === selectedTrainId);
      if (selectedTrain && selectedTrain.last_known_location) {
        const loc = selectedTrain.last_known_location;
        if (loc.latitude !== undefined && loc.longitude !== undefined && loc.latitude !== null && loc.longitude !== null) {
          map.flyTo([loc.latitude, loc.longitude], 7, { animate: true, duration: 1 });
        }
      }
    }
  }, [selectedTrainId, trains, map]);

  return null;
};

export default function NetworkMap({ trains, onSelectTrain, selectedTrainId }: NetworkMapProps) {
  const { resolvedTheme } = useTheme();
  
  // We use MapTiler as the basemap provider, using keys from the environment
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || process.env.MAPTILER_API_KEY || '';
  const tileUrl = resolvedTheme === 'dark'
    ? `https://api.maptiler.com/maps/basic-v2-dark/256/{z}/{x}/{y}.png?key=${mapTilerKey}`
    : `https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=${mapTilerKey}`;

  // Generate mock corridor segments for congestion overlay
  const normalCorridor: [number, number][] = [
    [stations[0].lat, stations[0].lng], // NDLS
    [stations[1].lat, stations[1].lng], // MTJ
  ];
  
  const moderateCorridor: [number, number][] = [
    [stations[1].lat, stations[1].lng], // MTJ
    [stations[2].lat, stations[2].lng], // AGC
    [stations[3].lat, stations[3].lng], // GWL
  ];

  const criticalCorridor: [number, number][] = [
    [stations[3].lat, stations[3].lng], // GWL
    [stations[4].lat, stations[4].lng], // BPL
  ];
  
  const otherCorridor: [number, number][] = [
    [stations[4].lat, stations[4].lng], // BPL
    [stations[5].lat, stations[5].lng], // CSMT
  ];

  return (
    <div className="h-full w-full relative z-0 rounded-xl overflow-hidden border border-border">
      <MapContainer 
        center={[24.0, 78.0]} 
        zoom={5} 
        style={{ height: '100%', width: '100%', backgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#f8fafc' }}
        zoomControl={false}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        <MapController selectedTrainId={selectedTrainId} trains={trains} />

        {/* Railway Corridor Lines with Congestion States */}
        {/* Normal Corridor */}
        <Polyline 
          positions={normalCorridor} 
          pathOptions={{ color: '#3B82F6', weight: 3, opacity: 0.8 }} 
        />
        {/* Moderate Congestion Corridor */}
        <Polyline 
          positions={moderateCorridor} 
          pathOptions={{ color: '#F59E0B', weight: 4, opacity: 0.9, dashArray: '6, 6' }} 
        />
        {/* Critical Congestion Corridor */}
        <Polyline 
          positions={criticalCorridor} 
          pathOptions={{ color: '#EF4444', weight: 5, opacity: 1 }} 
        />
        {/* Rest of the network */}
        <Polyline 
          positions={otherCorridor} 
          pathOptions={{ color: '#3B82F6', weight: 2, opacity: 0.6, dashArray: '4, 8' }} 
        />

        {/* Station Markers */}
        {stations.map(station => (
          <Marker 
            key={station.id} 
            position={[station.lat, station.lng]} 
            icon={createStationIcon()}
          >
            <Popup className="custom-popup">
              <div className="font-semibold text-sm">{station.name}</div>
              <div className="text-xs text-muted-foreground">Code: {station.id}</div>
              <div className="text-xs mt-1">Active Trains: {Math.floor(Math.random() * 10) + 1}</div>
            </Popup>
          </Marker>
        ))}

        {/* Train Markers */}
        {trains.map((train) => {
          const loc = train.last_known_location;
          const isSelected = train.train_number === selectedTrainId;
          
          if (!loc || loc.latitude === undefined || loc.longitude === undefined || loc.latitude === null || loc.longitude === null) {
             return null;
          }
          
          const speed = loc.speed_kmh !== undefined && loc.speed_kmh !== null ? `${Math.round(loc.speed_kmh)} km/h` : 'N/A';
          const delay = loc.delay_minutes ? `${loc.delay_minutes} min late` : 'On Time';
          const posSource = loc.position_source === 'telemetry_derived' ? 'LIVE / Telemetry-derived position' : (loc.position_source || 'Unknown source');
          
          return (
            <Marker
              key={train.train_number}
              position={[loc.latitude, loc.longitude]}
              icon={createTrainIcon(train.status)}
              eventHandlers={{
                click: () => onSelectTrain(train),
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              {isSelected && (
                <Popup closeButton={false} autoClose={false} className="train-selected-popup">
                  <div className="font-medium text-xs whitespace-nowrap">
                    <div className="font-bold text-sm mb-1">{train.train_number}</div>
                    <div className="text-white/90">Speed: {speed}</div>
                    <div className="text-white/90">Delay: {delay}</div>
                    <div className="text-white/80 text-[10px] mt-1 border-t border-white/20 pt-1">
                      {posSource}
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Add custom styling for Leaflet inside Next.js to match our theme */}
      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background-color: var(--card);
          color: var(--foreground);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        .leaflet-popup-tip {
          background-color: var(--card);
          border-top: 1px solid var(--border);
          border-left: 1px solid var(--border);
        }
        .train-selected-popup .leaflet-popup-content-wrapper {
          padding: 2px 4px;
          border-radius: 4px;
          background-color: #3B82F6;
          color: white;
          border: none;
        }
        .train-selected-popup .leaflet-popup-tip {
          background-color: #3B82F6;
          border: none;
        }
        .train-selected-popup .leaflet-popup-content {
          margin: 4px 8px;
        }
        .leaflet-control-container {
          display: none; /* Hide default controls as per instructions */
        }
      `}</style>
    </div>
  );
}
