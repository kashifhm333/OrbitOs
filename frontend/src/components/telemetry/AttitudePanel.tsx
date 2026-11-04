import React from 'react';
import { Compass, RotateCcw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { SectionHeader } from '../common/SectionHeader';

export const AttitudePanel: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();
  const sat = selectedSatelliteId ? satellites[selectedSatelliteId] : null;
  if (!sat) return <div className="text-xs text-slate-500 font-mono text-center py-8">Select a satellite</div>;

  // Derive approximate attitude from velocity vector (simplified display values)
  const vx = sat.velocity_eci_mps[0];
  const vy = sat.velocity_eci_mps[1];
  const roll = ((vx * 0.01) % 5).toFixed(3);
  const pitch = ((vy * 0.01) % 5).toFixed(3);
  const yaw = (Math.atan2(vy, vx) * (180 / Math.PI)).toFixed(3);

  return (
    <div className="space-y-3">
      <SectionHeader icon={<Compass className="w-3.5 h-3.5" />} title="Attitude (ECI)" />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Roll', value: roll, unit: '°' },
          { label: 'Pitch', value: pitch, unit: '°' },
          { label: 'Yaw', value: yaw, unit: '°' },
        ].map((m) => (
          <div key={m.label} className="p-2.5 rounded-xl bg-space-800/60 border border-space-700 text-center space-y-1">
            <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">{m.label}</div>
            <div className="text-sm font-mono font-semibold text-slate-100">{m.value}<span className="text-[10px] text-slate-500 ml-0.5">{m.unit}</span></div>
          </div>
        ))}
      </div>
      <SectionHeader icon={<RotateCcw className="w-3.5 h-3.5" />} title="Angular Rates" />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'P (°/s)', value: '0.0002' },
          { label: 'Q (°/s)', value: '-0.0001' },
          { label: 'R (°/s)', value: '0.0003' },
        ].map((m) => (
          <div key={m.label} className="p-2.5 rounded-xl bg-space-800/60 border border-space-700 text-center space-y-1">
            <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">{m.label}</div>
            <div className="text-sm font-mono font-semibold text-cyan-400">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

