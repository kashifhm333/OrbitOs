import React from 'react';
import { Battery, Fuel, Globe2 } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const FleetPanel: React.FC = () => {
  const { satellites, selectedSatelliteId, setSelectedSatellite } = useOrbitStore();

  const satList = Object.values(satellites);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-space-700">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Globe2 className="w-4 h-4 text-cyan-400" />
          <span>Active Constellation Fleet ({satList.length})</span>
        </h3>
        <span className="text-xs font-mono text-cyan-400">LEO SIMULATION</span>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
        {satList.map((sat) => {
          const isSelected = selectedSatelliteId === sat.satellite_id;
          
          // Approximate altitude from position norm
          const r_norm = Math.sqrt(
            sat.position_eci_m[0] ** 2 + sat.position_eci_m[1] ** 2 + sat.position_eci_m[2] ** 2
          );
          const altitude_km = Math.round((r_norm - 6378137.0) / 1000.0);

          return (
            <div
              key={sat.satellite_id}
              onClick={() => setSelectedSatellite(sat.satellite_id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-space-700/80 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                  : 'bg-space-800/60 border-space-700 hover:border-space-600 hover:bg-space-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-slate-100 flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${sat.in_eclipse ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                  <span>{sat.name}</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  sat.operational_state === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                  sat.operational_state === 'MANEUVERING' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {sat.operational_state}
                </span>
              </div>

              {/* Progress metrics */}
              <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Battery className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{sat.battery_soc_pct}%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span>{sat.propellant_mass_kg} kg</span>
                </div>
                <div className="flex items-center space-x-1.5 justify-end text-slate-400">
                  <span>{altitude_km} km</span>
                </div>
              </div>

              {/* Mini Battery Bar */}
              <div className="w-full bg-space-900 rounded-full h-1 mt-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    sat.battery_soc_pct > 50 ? 'bg-cyan-400' : sat.battery_soc_pct > 20 ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${sat.battery_soc_pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
