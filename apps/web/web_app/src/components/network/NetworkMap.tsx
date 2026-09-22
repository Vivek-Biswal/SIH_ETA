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
      // Very basic mock coordinates mapping based on train index for demo
      // In real life, trains would have lat/lng
      const selectedTrain = trains.find(t => t.train_number === selectedTrainId);
      if (selectedTrain) {
        // Use a mock location for the selected train
        const trainIndex = trains.indexOf(selectedTrain);
        const mockLat = 28.6139 - (trainIndex * 1.5);
        const mockLng = 77.2090 + (trainIndex * 0.2);
        map.flyTo([mockLat, mockLng], 7, { animate: true, duration: 1 });
      }
    }
  }, [selectedTrainId, trains, map]);

  return null;
};

export default function NetworkMap({ trains, onSelectTrain, selectedTrainId }: NetworkMapProps) {
  const { resolvedTheme } = useTheme();
  
  // Choose tile layer based on theme
  // We use CartoDB basemaps which are clean and professional and don't require API keys
  const tileUrl = resolvedTheme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Generate a mock route line connecting the stations
  const routePositions: [number, number][] = stations.map(s => [s.lat, s.lng]);

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

        {/* Railway Route Line */}
        <Polyline 
          positions={routePositions} 
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
        {trains.map((train, index) => {
          // Assign mock coordinates spread along the route for visualization
          const mockLat = 28.6139 - (index * 1.5);
          const mockLng = 77.2090 + (index * 0.2);
          const isSelected = train.train_number === selectedTrainId;
          
          return (
            <Marker
              key={train.train_number}
              position={[mockLat, mockLng]}
              icon={createTrainIcon(train.status)}
              eventHandlers={{
                click: () => onSelectTrain(train),
              }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              {/* Optional tiny tooltip, but user requested mainly panel */}
              {isSelected && (
                <Popup closeButton={false} autoClose={false} className="train-selected-popup">
                  <div className="font-medium text-xs whitespace-nowrap">{train.train_number}</div>
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
