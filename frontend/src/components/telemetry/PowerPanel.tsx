import React from 'react';
import { Zap, Battery, Sun } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { MetricCard } from '../common/MetricCard';
import { SectionHeader } from '../common/SectionHeader';

export const PowerPanel: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();
  const sat = selectedSatelliteId ? satellites[selectedSatelliteId] : null;
  if (!sat) return <div className="text-xs text-slate-500 font-mono text-center py-8">Select a satellite</div>;

  const soc = sat.battery_soc_pct;
  const barColor = soc > 50 ? 'bg-cyan-400' : soc > 20 ? 'bg-amber-400' : 'bg-red-500';
  const solarPct = sat.in_eclipse ? 0 : 100;

  return (
    <div className="space-y-3">
      <SectionHeader icon={<Zap className="w-3.5 h-3.5" />} title="Power Systems" />
      <MetricCard
        label="Solar Array"
        value={`${solarPct}%`}
        subLabel={sat.in_eclipse ? 'ECLIPSE' : 'NOMINAL'}
        barPercent={solarPct}
        barColor={sat.in_eclipse ? 'bg-slate-600' : 'bg-yellow-400'}
        icon={<Sun className="w-3 h-3" />}
      />
      <MetricCard
        label="Battery SoC"
        value={`${soc.toFixed(1)}%`}
        barPercent={soc}
        barColor={barColor}
        valueColor={soc > 50 ? 'text-cyan-400' : soc > 20 ? 'text-amber-400' : 'text-red-400'}
        icon={<Battery className="w-3 h-3" />}
      />
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Bus Voltage" value="28.4" unit="V" />
        <MetricCard label="Bus Current" value="4.2" unit="A" />
      </div>
      <div className="p-2.5 rounded-xl bg-space-800/60 border border-space-700 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Power Mode</span>
        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${sat.in_eclipse ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
          {sat.in_eclipse ? 'BATTERY' : 'SOLAR'}
        </span>
      </div>
    </div>
  );
};

