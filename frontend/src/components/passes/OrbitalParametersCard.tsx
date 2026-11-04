import React from 'react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const OrbitalParametersCard: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();
  const sat = selectedSatelliteId ? satellites[selectedSatelliteId] : null;

  const r_norm = sat ? Math.sqrt(sat.position_eci_m[0] ** 2 + sat.position_eci_m[1] ** 2 + sat.position_eci_m[2] ** 2) : 0;
  const v_norm = sat ? Math.sqrt(sat.velocity_eci_mps[0] ** 2 + sat.velocity_eci_mps[1] ** 2 + sat.velocity_eci_mps[2] ** 2) : 0;
  const altitude_km = Math.round((r_norm - 6378137.0) / 1000.0);
  const sma_km = r_norm > 0 ? (r_norm / 1000).toFixed(1) : '—';
  const period_min = r_norm > 0 ? ((2 * Math.PI * Math.sqrt(r_norm ** 3 / 3.986004418e14)) / 60).toFixed(1) : '—';
  const speed_kmps = (v_norm / 1000).toFixed(2);

  const params = [
    { label: 'Semi-major Axis', value: `${sma_km} km` },
    { label: 'Altitude', value: `${altitude_km > 0 ? altitude_km : '—'} km` },
    { label: 'Orbital Period', value: `${period_min} min` },
    { label: 'Speed', value: `${speed_kmps} km/s` },
    { label: 'Frame', value: 'ECI (J2000)' },
    { label: 'In Eclipse', value: sat?.in_eclipse ? 'TRUE (UMBRA)' : 'FALSE (SUNLIT)' },
  ];

  return (
    <div className="space-y-2 select-none">
      <h4 className="text-[10px] uppercase tracking-[0.15em] text-[#8295AC] font-semibold">
        Orbital State Vectors — {sat?.name || 'Selected Object'}
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {params.map((p) => (
          <div key={p.label} className="p-2 rounded-xl bg-[#071426] border border-[#1A3450]">
            <div className="text-[9px] uppercase tracking-[0.1em] text-[#8295AC] mb-0.5">{p.label}</div>
            <div className="text-xs font-mono font-semibold text-[#E8F0FA]">{p.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
