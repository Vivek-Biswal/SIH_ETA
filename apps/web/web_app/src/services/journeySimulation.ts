import type { Stop } from './passenger';

export type ScenarioStop = { name: string; code: string; sequence: number; minute: number };
export type Disruption = { section: number; minutes: number; recovered: number };

// Preserve every visit, including repeated station codes and midnight rollovers.
export function simulationStops(route: Stop[]): ScenarioStop[] {
  let previous = -Infinity;
  let origin = 0;
  let clockOnly: boolean | undefined;
  return route.map((stop, sequence) => {
    const value = sequence === 0 ? stop.scheduled_departure || stop.scheduled_arrival : stop.scheduled_arrival || stop.scheduled_departure;
    if (!value || !stop.station) throw new Error('This route has incomplete station or timetable data. Try another train.');
    let minute: number;
    const isClock = /^\d{2}:\d{2}(:\d{2})?$/.test(value);
    if (clockOnly !== undefined && clockOnly !== isClock) throw new Error('The timetable mixes dated and undated times. Try another journey.');
    clockOnly = isClock;
    if (isClock) {
      const [hour, min, sec = 0] = value.split(':').map(Number);
      if (hour > 23 || min > 59 || sec > 59) throw new Error('Invalid timetable time.');
      minute = hour * 60 + min;
      while (minute < previous) minute += 1440;
    } else minute = /^\d{4}-\d{2}-\d{2}T/.test(value) ? Date.parse(value) / 60000 : NaN;
    if (!Number.isFinite(minute) || minute < previous) throw new Error('The timetable order could not be verified.');
    previous = minute;
    if (sequence === 0) origin = minute;
    return { name: stop.station.name, code: stop.station.code, sequence, minute: minute - origin };
  });
}

export function arrivalMinute(stop: ScenarioStop, event: Disruption | null): number {
  return stop.minute + (event && stop.sequence > event.section ? Math.max(0, event.minutes - event.recovered) : 0);
}

export function simulationPosition(stops: ScenarioStop[], elapsed: number, event: Disruption | null) {
  let index = 0;
  while (index < stops.length - 1 && elapsed >= arrivalMinute(stops[index + 1], event)) index++;
  if (index === stops.length - 1) return { index, progress: 1, arrived: true };
  const start = arrivalMinute(stops[index], event);
  const end = arrivalMinute(stops[index + 1], event);
  const wait = event?.section === index ? Math.max(0, event.minutes - event.recovered) : 0;
  return { index, progress: Math.max(0, Math.min(1, (elapsed - start - wait) / Math.max(1, end - start - wait))), arrived: false };
}
