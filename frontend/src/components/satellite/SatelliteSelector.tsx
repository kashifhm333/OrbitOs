import React, { useState } from 'react';
import { ChevronDown, Satellite } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const SatelliteSelector: React.FC = () => {
  const { satellites, selectedSatelliteId, setSelectedSatellite } = useOrbitStore();
  const [open, setOpen] = useState(false);
  const satList = Object.values(satellites);
  const selected = selectedSatelliteId ? satellites[selectedSatelliteId] : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-800 border border-space-600 hover:border-cyan-500/40 transition-all text-sm"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${selected?.in_eclipse ? 'bg-amber-400' : 'bg-emerald-400 glow-cyan'}`} />
        <span className="font-medium text-slate-100 font-mono text-xs">{selected?.name ?? 'Select Satellite'}</span>
        {selected && (
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
            {selected.operational_state}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-space-800 border border-space-600 rounded-xl shadow-2xl z-50 min-w-[220px] overflow-hidden">
          {satList.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-500 font-mono">No satellites in simulation</div>
          )}
          {satList.map((sat) => (
            <button
              key={sat.satellite_id}
              onClick={() => { setSelectedSatellite(sat.satellite_id); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-space-700 transition-colors text-xs ${
                sat.satellite_id === selectedSatelliteId ? 'bg-space-700/70 text-cyan-400' : 'text-slate-200'
              }`}
            >
              <Satellite className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
              <div>
                <div className="font-medium font-mono">{sat.name}</div>
                <div className="text-[10px] text-slate-500">{sat.satellite_id}</div>
              </div>
              <span className={`ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded ${
                sat.operational_state === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' :
                sat.operational_state === 'MANEUVERING' ? 'bg-violet-500/15 text-violet-400' :
                'bg-amber-500/15 text-amber-400'
              }`}>{sat.operational_state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

