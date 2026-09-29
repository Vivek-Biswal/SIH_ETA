'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

type IncidentState = 'closed' | 'open' | 'submitted';

const INCIDENT_TYPES = [
  { value: 'unexpected_stoppage', label: '🛑 Unexpected train stoppage' },
  { value: 'major_delay', label: '⏳ Major or unexplained delay' },
  { value: 'accident', label: '⚠️ Accident / mishap on route' },
  { value: 'route_blockage', label: '🚧 Route blockage or diversion' },
  { value: 'severe_weather', label: '🌩️ Severe weather disruption' },
  { value: 'technical', label: '🔧 Technical / mechanical failure' },
  { value: 'station_issue', label: '🚉 Station-related disruption' },
  { value: 'other', label: '📋 Other operational disruption' },
];

export function IncidentReport({
  trainNumber,
  date,
  currentStation,
}: {
  trainNumber: string;
  date?: string;
  currentStation?: string;
}) {
  const [state, setState] = useState<IncidentState>('closed');
  const [incidentType, setIncidentType] = useState('');
  const [location, setLocation] = useState(currentStation || '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!incidentType) { setError('Please select an incident type.'); return; }
    if (!description.trim()) { setError('Please add a brief description.'); return; }
    setError('');

    const report = {
      trainNumber,
      date,
      station: location || currentStation,
      incidentType,
      description: description.trim(),
      reportedAt: new Date().toISOString(),
      verificationStatus: 'user_reported_unverified',
    };

    // Stored locally for now — no API endpoint yet
    console.info('[Incident Report]', report);
    setState('submitted');
  }

  function handleClose() {
    setState('closed');
    setIncidentType('');
    setDescription('');
    setLocation(currentStation || '');
    setError('');
  }

  if (state === 'submitted') {
    return (
      <div className="mt-3 rounded-2xl border border-border bg-card p-5 flex items-start gap-3">
        <CheckCircle2 size={20} className="text-green-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Incident reported</p>
          <p className="text-xs text-muted-foreground mt-1">
            Marked as <span className="font-medium">user-reported / unverified</span>. Thank you for helping improve railway intelligence.
          </p>
          <button onClick={handleClose} className="mt-3 text-xs text-primary hover:underline">
            Report another
          </button>
        </div>
      </div>
    );
  }

  if (state === 'closed') {
    return (
      <button
        onClick={() => setState('open')}
        className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        <AlertTriangle size={14} />
        Report an incident on this train
      </button>
    );
  }

  // Open form
  return (
    <div className="mt-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-destructive" />
          <p className="text-sm font-semibold text-foreground">Report an Incident</p>
        </div>
        <button
          onClick={handleClose}
          className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Train info badge */}
      <p className="text-xs text-muted-foreground">
        Train <strong className="text-foreground">{trainNumber}</strong>
        {date && <> · {date}</>}
        {currentStation && <> · Near <strong className="text-foreground">{currentStation}</strong></>}
      </p>

      {/* Incident type */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
          Incident type <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INCIDENT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setIncidentType(t.value); setError(''); }}
              className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors text-left
                ${incidentType === t.value
                  ? 'border-destructive/60 bg-destructive/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          Station or location (optional)
        </label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder={currentStation || 'e.g. Between NDLS and GZB'}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
          Description <span className="text-destructive">*</span>
        </label>
        <textarea
          value={description}
          onChange={e => { setDescription(e.target.value); setError(''); }}
          placeholder="Briefly describe what happened. Be factual — this report will be marked unverified until confirmed."
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/60"
        />
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex gap-3 items-center">
        <button
          onClick={handleSubmit}
          className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Submit report
        </button>
        <button
          onClick={handleClose}
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-muted-foreground/60 leading-5">
        ⚠️ Reports are submitted as <strong>user-reported / unverified</strong>. A single report does not confirm an incident. Multiple independent reports may trigger further review.
      </p>
    </div>
  );
}
