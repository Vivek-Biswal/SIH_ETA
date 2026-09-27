'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SimMetrics,
  SimSegment,
  SimStation,
  SimTrain,
  SimulationState,
} from '@/types/simulation';

// ---------------------------------------------------------------------------
// CORRIDOR GEOGRAPHY — Agra Cantt → Gwalior → Jhansi (North-Central Railway)
// Stations & coordinates are real geographical positions.
// This data is used ONLY in SIMULATION MODE.
// ---------------------------------------------------------------------------

export const SIM_STATIONS: SimStation[] = [
  { code: 'NDLS', name: 'New Delhi',    lat: 28.6139,  lng: 77.2090, sequence: 0 },
  { code: 'MTJ',  name: 'Mathura Jn',  lat: 27.4924,  lng: 77.6737, sequence: 1 },
  { code: 'AGC',  name: 'Agra Cantt',  lat: 27.1767,  lng: 78.0081, sequence: 2 },
  { code: 'DHO',  name: 'Dholpur',     lat: 26.7001,  lng: 78.0750, sequence: 3 },
  { code: 'GWL',  name: 'Gwalior',     lat: 26.2183,  lng: 78.1828, sequence: 4 },
  { code: 'DAA',  name: 'Dabra',       lat: 25.8861,  lng: 78.3337, sequence: 5 },
  { code: 'JHS',  name: 'Jhansi',      lat: 25.4484,  lng: 78.5685, sequence: 6 },
];

function makeSeg(fromIdx: number, toIdx: number): SimSegment {
  const from = SIM_STATIONS[fromIdx];
  const to   = SIM_STATIONS[toIdx];
  return {
    id: `${from.code}-${to.code}`,
    from,
    to,
    congestion: 'NORMAL',
    isBottleneck: false,
  };
}

const INITIAL_SEGMENTS: SimSegment[] = [
  makeSeg(0, 1),
  makeSeg(1, 2),
  makeSeg(2, 3),  // AGC-DHO — bottleneck target
  makeSeg(3, 4),  // DHO-GWL — secondary affected
  makeSeg(4, 5),
  makeSeg(5, 6),
];

// IDs of segments that will become the bottleneck when triggered
const BOTTLENECK_SEGMENT_ID = 'AGC-DHO';
const SECONDARY_SEGMENT_ID  = 'DHO-GWL';

// ---------------------------------------------------------------------------
// INITIAL TRAIN LAYOUT — trains spread across the corridor
// ---------------------------------------------------------------------------

function buildInitialTrains(): SimTrain[] {
  const trains: SimTrain[] = [];
  const configs = [
    { id: 'SIM-12919', name: 'MALWA EXP',   segIdx: 0, prog: 0.75 },
    { id: 'SIM-12920', name: 'RAJDHANI SIM',segIdx: 1, prog: 0.30 },
    { id: 'SIM-12950', name: 'AV EXPRESS',  segIdx: 2, prog: 0.60 },
    { id: 'SIM-12654', name: 'NZM SF SIM',  segIdx: 3, prog: 0.10 },
    { id: 'SIM-11077', name: 'JHELUM EXP',  segIdx: 4, prog: 0.80 },
    { id: 'SIM-12627', name: 'KARNATAKA SIM',segIdx:5, prog: 0.20 },
  ];

  configs.forEach(({ id, name, segIdx, prog }) => {
    const seg = INITIAL_SEGMENTS[segIdx];
    const { lat, lng } = interpolatePos(seg.from, seg.to, prog);
    trains.push({
      source: 'simulation',
      id,
      name,
      lat,
      lng,
      segmentProgress: prog,
      segmentId: seg.id,
      fromStation: seg.from,
      toStation: seg.to,
      speedKmh: 110,
      nominalSpeedKmh: 110,
      delayMinutes: 0,
      status: 'ON_TIME',
      bearing: calcBearing(seg.from, seg.to),
    });
  });
  return trains;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function interpolatePos(from: SimStation, to: SimStation, progress: number) {
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
  };
}

function calcBearing(from: SimStation, to: SimStation): number {
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function segmentDistanceKm(from: SimStation, to: SimStation): number {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSegmentById(segs: SimSegment[], id: string): SimSegment | undefined {
  return segs.find((s) => s.id === id);
}

function nextSegment(segs: SimSegment[], currentId: string): SimSegment | undefined {
  const idx = segs.findIndex((s) => s.id === currentId);
  return idx >= 0 && idx < segs.length - 1 ? segs[idx + 1] : undefined;
}

function computeMetrics(
  trains: SimTrain[],
  segments: SimSegment[],
  state: SimulationState,
  mitigationAt: number | null,
  now: number
): SimMetrics {
  const affected = trains.filter((t) => t.delayMinutes > 0).length;
  const avgDelay =
    trains.length > 0
      ? trains.reduce((s, t) => s + t.delayMinutes, 0) / trains.length
      : 0;
  const critical = segments.filter((s) => s.congestion === 'CRITICAL').length;
  const congestionPct =
    segments.length > 0
      ? Math.round(
          (segments.filter((s) => s.congestion !== 'NORMAL').length /
            segments.length) *
            100
        )
      : 0;

  let recoveryPct = 0;
  if ((state === 'RECOVERY' || state === 'RECOVERED') && mitigationAt) {
    const recoveryDuration = 30_000; // 30s sim time at 1×
    recoveryPct = Math.min(100, Math.round(((now - mitigationAt) / recoveryDuration) * 100));
    if (state === 'RECOVERED') recoveryPct = 100;
  }

  const throughputPct = Math.max(0, 100 - congestionPct - Math.min(30, affected * 5));

  return {
    congestionPct,
    affectedTrains: affected,
    avgDelayMinutes: Math.round(avgDelay),
    criticalSections: critical,
    throughputPct: Math.max(0, Math.min(100, throughputPct)),
    recoveryPct,
    state,
  };
}

// ---------------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------------

const TICK_MS = 200; // simulation tick interval

export interface UseSimulationReturn {
  trains:    SimTrain[];
  segments:  SimSegment[];
  metrics:   SimMetrics;
  state:     SimulationState;
  running:   boolean;
  speed:     number;
  start:     () => void;
  pause:     () => void;
  reset:     () => void;
  triggerBottleneck: () => void;
  runMitigation:     () => void;
  setSpeed:  (m: number) => void;
}

export function useSimulation(): UseSimulationReturn {
  const [trains,   setTrains]   = useState<SimTrain[]>(buildInitialTrains);
  const [segments, setSegments] = useState<SimSegment[]>(INITIAL_SEGMENTS);
  const [state,    setState]    = useState<SimulationState>('NORMAL');
  const [running,  setRunning]  = useState(false);
  const [speed,    setSpeedVal] = useState(1);

  // Refs for mutation-friendly access inside the interval
  const trainsRef    = useRef(trains);
  const segmentsRef  = useRef(segments);
  const stateRef     = useRef<SimulationState>('NORMAL');
  const runningRef   = useRef(false);
  const speedRef     = useRef(1);

  const bottleneckAt  = useRef<number | null>(null);
  const mitigationAt  = useRef<number | null>(null);

  const sync = (
    newTrains: SimTrain[],
    newSegs: SimSegment[],
    newState: SimulationState
  ) => {
    trainsRef.current   = newTrains;
    segmentsRef.current = newSegs;
    stateRef.current    = newState;
    setTrains([...newTrains]);
    setSegments([...newSegs]);
    setState(newState);
  };

  const tick = useCallback(() => {
    if (!runningRef.current) return;

    const now   = Date.now();
    const segs  = segmentsRef.current.map((s) => ({ ...s }));
    const curState = stateRef.current;
    let newState   = curState;

    // -------------------------------------------------------------------
    // 1. Determine segment congestion targets based on elapsed time
    // -------------------------------------------------------------------
    const bnElapsed = bottleneckAt.current ? now - bottleneckAt.current : 0;
    const mtElapsed = mitigationAt.current ? now - mitigationAt.current : 0;
    const simElapsed = bnElapsed / speedRef.current;
    const recElapsed = mtElapsed  / speedRef.current;

    if (curState === 'BUILDING') {
      // ramp up over 12 seconds of real time
      const pct = Math.min(1, simElapsed / 12_000);
      segs.forEach((s) => {
        if (s.id === BOTTLENECK_SEGMENT_ID) {
          s.congestion = pct > 0.5 ? 'CRITICAL' : pct > 0.2 ? 'MODERATE' : 'NORMAL';
          s.isBottleneck = pct > 0.5;
        } else if (s.id === SECONDARY_SEGMENT_ID) {
          s.congestion = pct > 0.75 ? 'MODERATE' : 'NORMAL';
        }
      });
      if (pct >= 1) newState = 'CRITICAL';
    }

    if (curState === 'CRITICAL') {
      segs.forEach((s) => {
        if (s.id === BOTTLENECK_SEGMENT_ID) { s.congestion = 'CRITICAL'; s.isBottleneck = true; }
        if (s.id === SECONDARY_SEGMENT_ID)  { s.congestion = 'MODERATE'; }
      });
    }

    if (curState === 'MITIGATION') {
      newState = 'RECOVERY';
    }

    if (curState === 'RECOVERY') {
      const pct = Math.min(1, recElapsed / 18_000);
      segs.forEach((s) => {
        if (s.id === BOTTLENECK_SEGMENT_ID) {
          s.congestion = pct > 0.7 ? 'NORMAL' : pct > 0.3 ? 'MODERATE' : 'CRITICAL';
          s.isBottleneck = pct < 0.5;
        } else if (s.id === SECONDARY_SEGMENT_ID) {
          s.congestion = pct > 0.5 ? 'NORMAL' : 'MODERATE';
        }
      });
      if (pct >= 1) newState = 'RECOVERED';
    }

    if (curState === 'RECOVERED') {
      segs.forEach((s) => { s.congestion = 'NORMAL'; s.isBottleneck = false; });
    }

    // -------------------------------------------------------------------
    // 2. Move trains
    // -------------------------------------------------------------------
    const newTrains = trainsRef.current.map((t) => {
      const seg = segs.find((s) => s.id === t.segmentId);
      const distKm = seg ? segmentDistanceKm(seg.from, seg.to) : 100;

      // Speed penalty based on congestion ahead
      let targetSpeed = t.nominalSpeedKmh;
      if (seg?.congestion === 'MODERATE') targetSpeed *= 0.55;
      if (seg?.congestion === 'CRITICAL')  targetSpeed *= 0.15;

      // During mitigation/recovery gradually restore speed
      if (curState === 'RECOVERY' || curState === 'RECOVERED') {
        const pct = Math.min(1, recElapsed / 18_000);
        if (seg?.congestion === 'MODERATE') targetSpeed = t.nominalSpeedKmh * (0.55 + pct * 0.45);
        if (seg?.congestion === 'NORMAL')   targetSpeed = t.nominalSpeedKmh;
      }

      // Smooth speed transition
      const smoothed = t.speedKmh * 0.85 + targetSpeed * 0.15;
      const speedMs  = (smoothed / 3600) * 1000; // km → per ms
      const tickSec  = (TICK_MS / 1000) * speedRef.current;
      const distPerTick = (speedMs * tickSec) / distKm; // progress per tick

      let newProg = t.segmentProgress + distPerTick;
      let newSeg  = t.segmentId;
      let newFrom = t.fromStation;
      let newTo   = t.toStation;

      if (newProg >= 1) {
        // Advance to next segment
        const nxt = nextSegment(segs, t.segmentId);
        if (nxt) {
          newProg = newProg - 1;
          newSeg  = nxt.id;
          newFrom = nxt.from;
          newTo   = nxt.to;
        } else {
          // Loop back to start of corridor for continuous demo
          const first = segs[0];
          newProg = 0;
          newSeg  = first.id;
          newFrom = first.from;
          newTo   = first.to;
        }
      }

      const { lat, lng } = interpolatePos(newFrom, newTo, newProg);

      // Delay accumulation
      let delay = t.delayMinutes;
      if (seg?.congestion === 'CRITICAL' || seg?.congestion === 'MODERATE') {
        delay = Math.min(90, delay + 0.05 * speedRef.current);
      } else if ((curState === 'RECOVERY' || curState === 'RECOVERED') && delay > 0) {
        delay = Math.max(0, delay - 0.03 * speedRef.current);
      }

      const status: SimTrain['status'] =
        delay > 30 ? 'CRITICAL' : delay > 5 ? 'DELAYED' : 'ON_TIME';

      return {
        ...t,
        lat,
        lng,
        segmentProgress: newProg,
        segmentId: newSeg,
        fromStation: newFrom,
        toStation: newTo,
        speedKmh: smoothed,
        delayMinutes: delay,
        status,
        bearing: calcBearing(newFrom, newTo),
      };
    });

    sync(newTrains, segs, newState);
  }, []);

  // Interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      runningRef.current = true;
      intervalRef.current = setInterval(tick, TICK_MS);
    } else {
      runningRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, tick]);

  // Sync state to refs
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const metrics = computeMetrics(trains, segments, state, mitigationAt.current, Date.now());

  // Public API
  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    runningRef.current = false;
    bottleneckAt.current  = null;
    mitigationAt.current  = null;
    const t = buildInitialTrains();
    const s = INITIAL_SEGMENTS.map((seg) => ({ ...seg, congestion: 'NORMAL' as const, isBottleneck: false }));
    trainsRef.current   = t;
    segmentsRef.current = s;
    stateRef.current    = 'NORMAL';
    setTrains(t);
    setSegments(s);
    setState('NORMAL');
  };

  const triggerBottleneck = () => {
    if (stateRef.current !== 'NORMAL') return;
    bottleneckAt.current = Date.now();
    stateRef.current = 'BUILDING';
    setState('BUILDING');
    if (!runningRef.current) {
      runningRef.current = true;
      setRunning(true);
    }
  };

  const runMitigation = () => {
    if (stateRef.current !== 'CRITICAL' && stateRef.current !== 'BUILDING') return;
    mitigationAt.current = Date.now();
    stateRef.current = 'MITIGATION';
    setState('MITIGATION');
    // Apply mitigation to trains: reduce delay by 30%, restore some speed
    const mitigated = trainsRef.current.map((t) => ({
      ...t,
      delayMinutes: Math.max(0, t.delayMinutes * 0.7),
      speedKmh: Math.min(t.nominalSpeedKmh, t.speedKmh * 1.4),
    }));
    trainsRef.current = mitigated;
    setTrains([...mitigated]);
  };

  const setSpeed = (m: number) => {
    speedRef.current = m;
    setSpeedVal(m);
  };

  return { trains, segments, metrics, state, running, speed, start, pause, reset, triggerBottleneck, runMitigation, setSpeed };
}
