import React from 'react';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, badge }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-2">
      {icon && <span className="text-cyan-400">{icon}</span>}
      {title}
    </h3>
    {badge}
  </div>
);

