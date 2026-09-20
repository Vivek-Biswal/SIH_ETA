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
          bg: 'bg-green-100 border-green-200 text-green-700',
          dot: 'bg-green-500',
          defaultText: 'On Time',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-100 border-amber-200 text-amber-700',
          dot: 'bg-amber-500',
          defaultText: 'Delayed',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-100 border-red-200 text-red-700',
          dot: 'bg-red-500',
          defaultText: 'Cancelled',
        };
      case 'INFO':
        return {
          bg: 'bg-blue-100 border-blue-200 text-blue-700',
          dot: 'bg-blue-500',
          defaultText: 'Info',
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
