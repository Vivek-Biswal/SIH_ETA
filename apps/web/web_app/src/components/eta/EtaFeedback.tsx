'use client';
import { useState } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

type FeedbackState = 'idle' | 'no-detail' | 'submitted';

const DELAY_REASONS = [
  { value: 'train_delayed', label: '🚆 Train was delayed' },
  { value: 'train_early', label: '🚀 Train arrived earlier than predicted' },
  { value: 'unexpected_stop', label: '🛑 Train stopped unexpectedly' },
  { value: 'route_disruption', label: '🛤️ Route disruption' },
  { value: 'weather', label: '🌧️ Weather issue' },
  { value: 'technical', label: '🔧 Technical / mechanical issue' },
  { value: 'other', label: '📋 Other' },
];

export function EtaFeedback({
  trainNumber,
  destination,
  predictedEta,
  date,
}: {
  trainNumber: string;
  destination: string;
  predictedEta?: string | null;
  date?: string;
}) {
  const [state, setState] = useState<FeedbackState>('idle');
  const [actualTime, setActualTime] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  function handleYes() {
    // Store locally — no API yet
    console.info('[ETA Feedback]', { trainNumber, destination, date, predictedEta, accurate: true });
    setState('submitted');
  }

  function handleSubmitNo() {
    console.info('[ETA Feedback]', {
      trainNumber, destination, date, predictedEta,
      accurate: false, actualTime, reason, description,
    });
    setState('submitted');
  }

  if (state === 'submitted') {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card p-5 flex items-center gap-3 text-sm">
        <CheckCircle2 size={20} className="text-green-500 shrink-0" />
        <p className="text-muted-foreground">Thank you — your feedback helps improve future predictions.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-border bg-card p-5 space-y-4">
      <p className="text-sm font-semibold text-foreground">Was this ETA accurate?</p>

      {state === 'idle' && (
        <div className="flex gap-3">
          <button
            onClick={handleYes}
            className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <CheckCircle2 size={16} />
            Yes, it was accurate
          </button>
          <button
            onClick={() => setState('no-detail')}
            className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            <XCircle size={16} />
            No, it was off
          </button>
        </div>
      )}

      {state === 'no-detail' && (
        <div className="space-y-4">
          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              What happened?
            </label>
            <div className="grid grid-cols-1 gap-2">
              {DELAY_REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="feedback-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional section */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Optional details
            </button>

            {showOptional && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Actual arrival time (if known)
                  </label>
                  <input
                    type="time"
                    value={actualTime}
                    onChange={e => setActualTime(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Describe what happened (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. Train stopped at Mathura for 30 minutes due to signal issue…"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmitNo}
              disabled={!reason}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Submit feedback
            </button>
            <button
              onClick={() => setState('idle')}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-muted-foreground/60">
            Reports are stored locally for now and are not verified automatically.
          </p>
        </div>
      )}
    </div>
  );
}
