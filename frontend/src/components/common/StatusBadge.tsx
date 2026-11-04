import React from 'react';

type Variant = 'active' | 'offline' | 'warning' | 'critical' | 'maneuvering' | 'standby' | 'verified' | 'info';

const variantStyles: Record<Variant, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  offline: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse',
  maneuvering: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  standby: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  verified: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

interface StatusBadgeProps {
  variant: Variant;
  label: string;
  dot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label, dot = false }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold uppercase tracking-wider ${variantStyles[variant]}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${variant === 'active' || variant === 'verified' ? 'bg-emerald-400' : variant === 'critical' ? 'bg-red-400 animate-ping' : variant === 'warning' ? 'bg-amber-400' : 'bg-cyan-400'}`} />}
    {label}
  </span>
);

