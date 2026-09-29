'use client';
import { useEffect, useState } from 'react';
import { PASSENGER_API, time } from '@/services/passenger';
type Forecast = { available: boolean; message: string; train_number: string; date: string; station_code: string; condition?: string; temperature_c?: number; wind_kmh?: number; rain_mm_3h?: number; forecast_at?: string; retrieved_at?: string; arrival_basis?: string };
export function ArrivalWeather({ number, date, station, predicted }: { number: string; date: string; station: string; predicted?: string | null }) {
  const [forecast, setForecast] = useState<Forecast | null>(null), [error, setError] = useState(''), [allowance, setAllowance] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setForecast(null); setError(''); setAllowance(0);
    if (!station || !date) return;
    fetch(`${PASSENGER_API}/trains/${number}/weather?${new URLSearchParams({date, station_code: station})}`, {signal: controller.signal})
      .then(async r => { if (!r.ok) throw new Error('Weather outlook is temporarily unavailable. Your ETA is unchanged.'); const data: Forecast = await r.json(); if (data.train_number !== number || data.date !== date || data.station_code !== station) throw new Error('Weather does not match this journey.'); return data; })
      .then(data => { if (!controller.signal.aborted) setForecast(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [number, date, station]);
  if (!station || !date) return null;
  const planned = predicted && Number.isFinite(Date.parse(predicted)) ? new Date(Date.parse(predicted) + allowance*60000).toISOString() : null;
  return <section className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5" aria-label="Arrival weather">
    <h3 className="font-semibold">Weather around your arrival · {station}</h3>
    {error ? <p role="status" className="mt-2 text-sm">{error}</p> : !forecast ? <p role="status" className="mt-2 text-sm">Checking OpenWeather forecast…</p> : <>
      {forecast.available && <><p className="mt-3 text-lg font-medium capitalize">{forecast.condition} · {forecast.temperature_c}°C</p><p className="mt-2 text-sm">Rain: {forecast.rain_mm_3h} mm / 3 hours · Wind: {forecast.wind_kmh} km/h</p><p className="mt-2 text-xs text-muted-foreground">OpenWeather · Forecast for {time(forecast.forecast_at)} near {forecast.arrival_basis} arrival · Retrieved {time(forecast.retrieved_at)}</p></>}
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{forecast.message}</p>
      {forecast.available && planned && <div className="mt-4 border-t border-border pt-4"><label className="text-sm">Optional weather planning allowance<select value={allowance} onChange={e => setAllowance(Number(e.target.value))} className="ml-3 rounded-lg border border-border bg-background p-2">{[0,15,30,60].map(n => <option key={n} value={n}>{n} min extra</option>)}</select></label><p className="mt-3 font-semibold">Your planning time: {time(planned)}</p><p className="mt-1 text-xs text-muted-foreground">Train ETA + your {allowance} min allowance. This does not change the predicted arrival.</p></div>}
    </>}
  </section>;
}
