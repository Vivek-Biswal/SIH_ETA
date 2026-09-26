import React from 'react';

export type BadgeType = 'LIVE' | 'ON_TIME' | 'WARNING' | 'CRITICAL' | 'INFO';

interface StatusBadgeProps {
  type: BadgeType;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  label,
  pulse = false,
  className = '',
}) => {
  const getStyle = () => {
    switch (type) {
      case 'LIVE':
      case 'ON_TIME':
        return {
          bg: 'bg-success/15 border-success/30 text-success',
          dot: 'bg-success',
          defaultText: 'On Time',
        };
      case 'WARNING':
        return {
          bg: 'bg-warning/15 border-warning/30 text-warning',
          dot: 'bg-warning',
          defaultText: 'Delayed',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-destructive/15 border-destructive/30 text-destructive',
          dot: 'bg-destructive',
          defaultText: 'Cancelled',
        };
      case 'INFO':
        return {
          bg: 'bg-info/15 border-info/30 text-info',
          dot: 'bg-info',
          defaultText: 'Info',
        };
      default:
        return {
          bg: 'bg-muted/15 border-border text-muted-foreground',
          dot: 'bg-muted-foreground',
          defaultText: label || String(type) || 'Unknown',
        };
    }
  };

  const config = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium tracking-wide ${config.bg} ${className}`}
    >
      {(pulse || type === 'LIVE') && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
          />
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`}
          />
        </span>
      )}
      {label || config.defaultText}
    </span>
  );
};
