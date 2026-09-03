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
        return 'text-[#22C55E]';
      case 'WARNING':
        return 'text-[#F59E0B]';
      case 'CRITICAL':
        return 'text-[#EF4444]';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="bg-[#18181B] border border-white/10 rounded-sm p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider mb-2">
        <span>{title}</span>
        {tag && (
          <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[#A1A1AA]">
            {tag}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${getValueColor()}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-[#A1A1AA] mt-1.5 font-sans flex items-center gap-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};
