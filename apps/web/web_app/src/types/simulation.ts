/**
 * Simulation types — entirely separate from live RailRadar data.
 * All simulated objects carry source: "simulation" to prevent mixing with live data.
 */

export type SimulationState =
  | 'NORMAL'
  | 'BUILDING'
  | 'CRITICAL'
  | 'MITIGATION'
  | 'RECOVERY'
  | 'RECOVERED';

export type SimTrainStatus = 'ON_TIME' | 'DELAYED' | 'CRITICAL';
export type SegmentCongestion = 'NORMAL' | 'MODERATE' | 'CRITICAL';

export interface SimStation {
  code: string;
  name: string;
  lat: number;
  lng: number;
  sequence: number;
}

export interface SimSegment {
  id: string;
  from: SimStation;
  to: SimStation;
  congestion: SegmentCongestion;
  isBottleneck: boolean;
}

export interface SimTrain {
  /** Always 'simulation' — never mix with live */
  source: 'simulation';
  id: string;
  name: string;
  /** Current lat position along corridor */
  lat: number;
  /** Current lng position along corridor */
  lng: number;
  /** 0.0–1.0 progress between fromStation and toStation */
  segmentProgress: number;
  /** Which corridor segment is the train currently on */
  segmentId: string;
  fromStation: SimStation;
  toStation: SimStation;
  speedKmh: number;
  /** Nominal max speed for this train */
  nominalSpeedKmh: number;
  delayMinutes: number;
  status: SimTrainStatus;
  bearing: number;
}

export interface SimMetrics {
  congestionPct: number;
  affectedTrains: number;
  avgDelayMinutes: number;
  criticalSections: number;
  throughputPct: number;
  recoveryPct: number;
  state: SimulationState;
}

export interface SimEvent {
  type: 'BOTTLENECK' | 'MITIGATION' | 'RESET';
  triggeredAt: number; // timestamp ms
}

export interface SimSpeed {
  label: '1×' | '2×' | '4×';
  multiplier: number;
}
