import React from 'react';
import { Radio, ArrowUp, ArrowDown, Wifi } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';

export const CommPanel: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();
  const sat = selectedSatelliteId ? satellites[selectedSatelliteId] : null;
  if (!sat) return <div className="text-xs text-slate-500 font-mono text-center py-8">Select a satellite</div>;

  const isActive = sat.operational_state === 'ACTIVE' || sat.operational_state === 'MANEUVERING';

  return (
    <div className="space-y-3">
      <SectionHeader icon={<Radio className="w-3.5 h-3.5" />} title="Communication" />
      <div className="space-y-2">
        {[
          { dir: 'Uplink', freq: '0.432 GHz (S-band)', icon: <ArrowUp className="w-3.5 h-3.5" />, online: isActive },
          { dir: 'Downlink', freq: '8.295 GHz (X-band)', icon: <ArrowDown className="w-3.5 h-3.5" />, online: isActive },
        ].map((link) => (
          <div key={link.dir} className="p-3 rounded-xl bg-space-800/60 border border-space-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">{link.icon}</span>
              <div>
                <div className="text-xs font-medium text-slate-200">{link.dir}</div>
                <div className="text-[10px] font-mono text-slate-500">{link.freq}</div>
              </div>
            </div>
            <StatusBadge variant={link.online ? 'active' : 'offline'} label={link.online ? 'ONLINE' : 'OFFLINE'} dot />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-xl bg-space-800/60 border border-space-700 space-y-1">
          <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1"><Wifi className="w-3 h-3" />Signal Strength</div>
          <div className="font-semibold text-slate-100">-46.2 <span className="text-[10px] text-slate-400">dBm</span></div>
        </div>
        <div className="p-2.5 rounded-xl bg-space-800/60 border border-space-700 space-y-1">
          <div className="text-[9px] uppercase tracking-[0.12em] text-slate-500">Data Rate</div>
          <div className="font-semibold text-slate-100">12.4 <span className="text-[10px] text-slate-400">Mbps</span></div>
        </div>
      </div>
    </div>
  );
};

