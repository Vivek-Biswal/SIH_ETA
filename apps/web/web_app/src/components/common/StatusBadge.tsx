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
          bg: 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]',
          dot: 'bg-[#22C55E]',
          defaultText: 'ON TIME',
        };
      case 'WARNING':
        return {
          bg: 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]',
          dot: 'bg-[#F59E0B]',
          defaultText: 'DELAYED',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]',
          dot: 'bg-[#EF4444]',
          defaultText: 'CRITICAL',
        };
      case 'INFO':
        return {
          bg: 'bg-[#3B82F6]/15 border-[#3B82F6]/30 text-[#3B82F6]',
          dot: 'bg-[#3B82F6]',
          defaultText: 'INFO',
        };
    }
  };

  const config = getStyle();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wider uppercase font-mono ${config.bg} ${className}`}
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
