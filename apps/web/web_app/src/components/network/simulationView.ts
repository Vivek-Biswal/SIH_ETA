import { SimSegment, SimStation, SimTrain, SimulationState } from '@/types/simulation';

export interface SimulationStationInsight {
  station: SimStation;
  scheduledMinutes: number;
  simulatedMinutes: number;
  changeMinutes: number;
  status: 'on-time' | 'delayed' | 'recovery';
}

export interface SimulationInsights {
  currentStation: SimStation;
  nextStation: SimStation;
  disruptionSegment: SimSegment | undefined;
  destination: SimStation;
  stationRows: SimulationStationInsight[];
  destinationDelayMinutes: number;
  remainingMinutes: number;
}

const EARTH_RADIUS_KM = 6371;

export function distanceKm(from: SimStation, to: SimStation): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function segmentBetween(segments: SimSegment[], from: SimStation, to: SimStation) {
  return segments.find((segment) => segment.from.code === from.code && segment.to.code === to.code);
}

function minutesForDistance(distance: number, speedKmh: number): number {
  return (distance / Math.max(25, speedKmh)) * 60;
}

/**
 * Turns the simulation engine's current position into passenger language.
 * Every value is derived from the selected train and the current simulation
 * state; this intentionally does not use demo ETA numbers.
 */
export function buildSimulationInsights(
  train: SimTrain,
  stations: SimStation[],
  segments: SimSegment[],
  state: SimulationState,
  recoveryPct: number,
): SimulationInsights {
  const currentIndex = Math.max(0, stations.findIndex((station) => station.code === train.fromStation.code));
  const currentStation = stations[currentIndex] ?? stations[0];
  const nextStation = train.toStation;
  const disruptionSegment = segments.find((segment) => segment.isBottleneck) ?? segments.find((segment) => segment.id === 'AGC-DHO');
  const remainingStations = stations.slice(currentIndex + 1);
  const speed = Math.max(25, train.speedKmh);
  const nominalSpeed = Math.max(25, train.nominalSpeedKmh);
  const firstSegment = segmentBetween(segments, train.fromStation, train.toStation);
  const remainingFirstSegment = firstSegment ? distanceKm(firstSegment.from, firstSegment.to) * (1 - train.segmentProgress) : distanceKm(train.fromStation, train.toStation);

  let scheduledElapsed = 0;
  const stationRows = remainingStations.map((station) => {
    const from = stationRowsPrevious(station, stations, currentIndex);
    const segment = segmentBetween(segments, from, station);
    const legDistance = segment ? distanceKm(segment.from, segment.to) : distanceKm(from, station);
    if (from.code === train.fromStation.code) {
      scheduledElapsed += minutesForDistance(remainingFirstSegment, nominalSpeed);
    } else {
      scheduledElapsed += minutesForDistance(legDistance, nominalSpeed);
    }

    const congestionPenalty = segment?.congestion === 'CRITICAL' ? 2.2 : segment?.congestion === 'MODERATE' ? 1.35 : 1;
    const recoveryFactor = state === 'RECOVERY' || state === 'RECOVERED' ? Math.max(0, 1 - recoveryPct / 100) : 1;
    const delayContribution = train.delayMinutes * recoveryFactor * congestionPenalty;
    const simulatedElapsed = scheduledElapsed + delayContribution;
    const changeMinutes = Math.max(0, simulatedElapsed - scheduledElapsed);
    return {
      station,
      scheduledMinutes: Math.max(1, Math.round(scheduledElapsed)),
      simulatedMinutes: Math.max(1, Math.round(simulatedElapsed)),
      changeMinutes: Math.round(changeMinutes),
      status: state === 'RECOVERY' || state === 'RECOVERED' ? 'recovery' : changeMinutes > 0 ? 'delayed' : 'on-time',
    } satisfies SimulationStationInsight;
  });

  const destination = stationRows.at(-1)?.station ?? train.toStation;
  const destinationRow = stationRows.at(-1);
  return {
    currentStation,
    nextStation,
    disruptionSegment,
    destination,
    stationRows,
    destinationDelayMinutes: destinationRow?.changeMinutes ?? 0,
    remainingMinutes: stationRows.at(-1)?.simulatedMinutes ?? Math.max(1, Math.round(minutesForDistance(remainingFirstSegment, speed))),
  };
}

function stationRowsPrevious(station: SimStation, stations: SimStation[], currentIndex: number): SimStation {
  const index = stations.findIndex((candidate) => candidate.code === station.code);
  return index <= currentIndex ? stations[currentIndex] : stations[index - 1];
}

