import type { Status } from './passenger';
export type Observation = { sequence: number; code: string; name: string; scheduled: string | null; actual: string | null; delay: number | null };
function timestamp(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}
export function observations(status: Status, now = Date.now()): Observation[] {
  return status.route.map((stop, sequence) => {
    const scheduled = timestamp(stop.scheduled_arrival), actual = timestamp(stop.actual_arrival);
    // Future stops may have estimates populated in actual_* by the provider.
    const usable = stop.has_departed === true && actual !== null && actual <= now && scheduled !== null;
    return { sequence, code: stop.station?.code || '', name: stop.station?.name || 'Unknown station', scheduled: stop.scheduled_arrival || null, actual: usable ? stop.actual_arrival! : null, delay: usable ? (actual - scheduled) / 60000 : null };
  });
}
export function summarize(rows: Observation[], tolerance = 5) {
  const measured = rows.filter(r => r.delay !== null && Number.isFinite(r.delay));
  const onTime = measured.filter(r => r.delay! <= tolerance).length;
  return { measured: measured.length, excluded: rows.length - measured.length, onTime, late: measured.length - onTime,
    percentage: measured.length ? onTime / measured.length * 100 : null,
    average: measured.length ? measured.reduce((sum,r) => sum + Math.max(0,r.delay!),0) / measured.length : null,
    maximum: measured.length ? Math.max(0,...measured.map(r=>r.delay!)) : null };
}
export function exportCSV(rows: Observation[], train: string, date: string) {
  const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replaceAll('"','""') + '"'; };
  return '\uFEFF' + [['Train','Journey date','Sequence','Station code','Station','Scheduled arrival','Reported actual arrival','Difference minutes'],...rows.map(r=>[train,date,r.sequence+1,r.code,r.name,r.scheduled,r.actual,r.delay])].map(r=>r.map(cell).join(',')).join('\r\n');
}
