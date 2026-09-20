import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: 'NORMAL' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  tag?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  status = 'NORMAL',
  tag,
}) => {
  const getValueColor = () => {
    switch (status) {
      case 'SUCCESS':
        return 'text-[var(--color-live-green)]';
      case 'WARNING':
        return 'text-[var(--color-warning-amber)]';
      case 'CRITICAL':
        return 'text-[var(--color-critical-red)]';
      default:
        return 'text-[var(--color-text-primary)]';
    }
  };

  return (
    <div className="bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] rounded-lg shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[var(--color-text-muted)] text-sm font-medium mb-3">
        <span>{title}</span>
        {tag && (
          <span className="text-[10px] font-medium bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] px-2 py-0.5 rounded text-[var(--color-text-muted)]">
            {tag}
          </span>
        )}
      </div>
      <div className={`text-3xl font-bold font-sans tracking-tight ${getValueColor()}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-sm text-[var(--color-text-muted)] mt-2 font-sans flex items-center gap-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};
