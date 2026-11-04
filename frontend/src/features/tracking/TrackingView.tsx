import React from 'react';
import { Compass } from 'lucide-react';
import { OrbitalCanvas } from '../../components/visualization/OrbitalCanvas';
import { useOrbitStore } from '../../store/useOrbitStore';

export const TrackingView: React.FC = () => {
  const { satellites, selectedSatelliteId, setSelectedSatellite, showDebris, setShowDebris, showTracks, setShowTracks } = useOrbitStore();
  const sat = selectedSatelliteId ? satellites[selectedSatelliteId] : null;

  const pos = sat?.position_eci_m || [0, 0, 0];
  const vel = sat?.velocity_eci_mps || [0, 0, 0];
  const r_norm = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
  const v_norm = Math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2);
  const altitude_km = r_norm > 0 ? ((r_norm - 6378137.0) / 1000.0).toFixed(1) : '—';
  const speed_kmps = (v_norm / 1000.0).toFixed(2);

  // Approximate sub-satellite geodetic coordinates
  const lat_deg = r_norm > 0 ? (Math.asin(pos[2] / r_norm) * (180.0 / Math.PI)).toFixed(2) : '0.00';
  const lon_deg = r_norm > 0 ? (Math.atan2(pos[1], pos[0]) * (180.0 / Math.PI)).toFixed(2) : '0.00';

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#050B16] select-none font-mono">
      {/* 3D Earth Viewport */}
      <div className="flex-1 relative">
        <OrbitalCanvas />

        {/* Top-Left Tracking HUD Overlay */}
        <div className="absolute top-4 left-4 bg-[#071426]/90 backdrop-blur-md border border-[#1A3450] p-4 rounded-xl text-xs space-y-3 z-10 max-w-sm">
          <div className="flex items-center justify-between border-b border-[#1A3450] pb-2">
            <span className="font-bold text-[#E8F0FA] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#00D5FF]" />
              <span>ORBITAL TRACKING VIEW</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00D5FF]/15 text-[#00D5FF] font-semibold">
              3D ECI J2000
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#8295AC]">Tracked Target:</span>
              <span className="text-[#E8F0FA] font-semibold">{sat?.name || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8295AC]">Sub-Satellite Lat:</span>
              <span className="text-[#00D5FF] font-semibold">{lat_deg}° N</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8295AC]">Sub-Satellite Lon:</span>
              <span className="text-[#00D5FF] font-semibold">{lon_deg}° E</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8295AC]">Orbit Altitude:</span>
              <span className="text-[#00D69A] font-semibold">{altitude_km} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8295AC]">Orbital Speed:</span>
              <span className="text-[#E8F0FA] font-semibold">{speed_kmps} km/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8295AC]">Eclipse Shadow:</span>
              <span className={sat?.in_eclipse ? "text-[#FFB547] font-semibold" : "text-[#00D69A] font-semibold"}>
                {sat?.in_eclipse ? "IN ECLIPSE (0% FLUX)" : "DIRECT SUNLIT"}
              </span>
            </div>
          </div>

          {/* Quick Target Selector */}
          <div className="pt-2 border-t border-[#1A3450] space-y-1">
            <div className="text-[10px] text-[#8295AC] uppercase">Constellation Targets:</div>
            <div className="flex flex-wrap gap-1">
              {Object.values(satellites).map((s) => (
                <button
                  key={s.satellite_id}
                  onClick={() => setSelectedSatellite(s.satellite_id)}
                  className={`px-2 py-1 rounded text-[10px] transition-all ${
                    selectedSatelliteId === s.satellite_id
                      ? 'bg-[#00D5FF] text-[#050B16] font-bold shadow-sm shadow-cyan-500/20'
                      : 'bg-[#0B1B2E] text-[#8295AC] hover:text-[#E8F0FA] border border-[#1A3450]'
                  }`}
                >
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top-Right Visualization Controls Overlay */}
        <div className="absolute top-4 right-4 bg-[#071426]/90 backdrop-blur-md border border-[#1A3450] p-3 rounded-xl text-xs space-y-2 z-10">
          <div className="text-[10px] text-[#8295AC] uppercase tracking-wider font-semibold mb-1">
            Viewport Layers
          </div>
          <button
            onClick={() => setShowTracks(!showTracks)}
            className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-all ${
              showTracks ? 'bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/30' : 'bg-[#0B1B2E] text-[#8295AC] border border-[#1A3450]'
            }`}
          >
            <span>Orbital Tracks</span>
            <span className="text-[9px]">{showTracks ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={() => setShowDebris(!showDebris)}
            className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-all ${
              showDebris ? 'bg-[#FF4D5E]/15 text-[#FF4D5E] border border-[#FF4D5E]/30' : 'bg-[#0B1B2E] text-[#8295AC] border border-[#1A3450]'
            }`}
          >
            <span>Debris Field</span>
            <span className="text-[9px]">{showDebris ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
