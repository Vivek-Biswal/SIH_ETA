import React from 'react';

interface ConfidenceGaugeProps {
  confidence: number;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ confidence }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  let color = 'var(--color-live-green)';
  let label = 'High Confidence';
  if (confidence < 50) {
    color = 'var(--color-critical-red)';
    label = 'Low Confidence';
  } else if (confidence < 80) {
    color = 'var(--color-warning-amber)';
    label = 'Medium Confidence';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Background Circle */}
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="var(--color-border-subtle)"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[var(--color-text-primary)]">{confidence}%</span>
        </div>
      </div>
      <div className={`mt-2 text-xs font-semibold`} style={{ color }}>
        {label}
      </div>
    </div>
  );
};
