import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subLabel?: string;
  barPercent?: number;
  barColor?: string;
  valueColor?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, unit, subLabel, barPercent, barColor = 'bg-cyan-400', valueColor = 'text-slate-100', icon
}) => (
  <div className="p-3 rounded-xl bg-space-800/60 border border-space-700 space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium flex items-center gap-1">
        {icon}{label}
      </span>
      {subLabel && <span className="text-[9px] font-mono text-slate-500">{subLabel}</span>}
    </div>
    <div className={`text-sm font-mono font-semibold metric-value ${valueColor}`}>
      {value}{unit && <span className="text-[11px] text-slate-400 ml-1">{unit}</span>}
    </div>
    {barPercent !== undefined && (
      <div className="w-full bg-space-900 rounded-full h-1 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }}
        />
      </div>
    )}
  </div>
);

