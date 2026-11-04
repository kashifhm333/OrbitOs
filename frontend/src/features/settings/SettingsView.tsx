import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Database, Server, Radio, Sliders, Globe } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const SettingsView: React.FC = () => {
  const { isWsConnected, timeAcceleration, showDebris, setShowDebris, showTracks, setShowTracks } = useOrbitStore();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const resp = await fetch('/api/v1/health');
        if (resp.ok) setHealth(await resp.json());
      } catch (err) {
        console.error('Failed to fetch health status:', err);
      }
    };
    fetchHealth();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-[#00D5FF]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">MISSION CONTROL SYSTEM SETTINGS</h1>
            <p className="text-[11px] text-[#8295AC]">Simulation clock step, 3D viewport rendering parameters, and safety boundary diagnostics.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[#00D69A]/15 text-[#00D69A] border border-[#00D69A]/30 text-[10px] font-semibold">
            SYSTEM HEALTHY
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulation Engine Parameters */}
        <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-4">
          <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00D5FF]" />
            <span>Astrodynamic Clock & Propagation Engine</span>
          </h2>

          <div className="space-y-3 text-[11px]">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
              <div>
                <div className="font-semibold text-[#E8F0FA]">Discrete Time Step ($\Delta t$)</div>
                <div className="text-[10px] text-[#8295AC]">Numerical integration step size for Keplerian propagation</div>
              </div>
              <span className="text-[#00D5FF] font-bold">1.0 Second</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
              <div>
                <div className="font-semibold text-[#E8F0FA]">Gravitational Model ($\mu_\oplus$)</div>
                <div className="text-[10px] text-[#8295AC]">Standard Earth gravitational parameter (WGS-84)</div>
              </div>
              <span className="text-[#00D5FF] font-bold">398,600.4418 km³/s²</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
              <div>
                <div className="font-semibold text-[#E8F0FA]">Perturbation Models</div>
                <div className="text-[10px] text-[#8295AC]">Earth oblateness J2 harmonics & cylindrical solar shadow</div>
              </div>
              <span className="text-[#00D69A] font-bold">ENABLED</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
              <div>
                <div className="font-semibold text-[#E8F0FA]">Simulation Time Acceleration</div>
                <div className="text-[10px] text-[#8295AC]">Wall-clock scaling multiplier</div>
              </div>
              <span className="text-[#00D5FF] font-bold">{timeAcceleration}x Multiplier</span>
            </div>
          </div>
        </div>

        {/* Viewport & 3D WebGL Quality */}
        <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-4">
          <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#00D5FF]" />
            <span>3D Earth Viewport Layers</span>
          </h2>

          <div className="space-y-3 text-[11px]">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
              <div>
                <div className="font-semibold text-[#E8F0FA]">Orbital Trajectory Curves</div>
                <div className="text-[10px] text-[#8295AC]">Render ellipses for all active constellation assets</div>
              </div>
              <button
                onClick={() => setShowTracks(!showTracks)}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                  showTracks ? 'bg-[#00D5FF] text-[#050B16]' : 'bg-[#071426] text-[#8295AC] border border-[#1A3450]'
                }`}
              >
                {showTracks ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
              <div>
                <div className="font-semibold text-[#E8F0FA]">Orbital Debris Fragments</div>
                <div className="text-[10px] text-[#8295AC]">Display simulated resident space objects for collision screening</div>
              </div>
              <button
                onClick={() => setShowDebris(!showDebris)}
                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                  showDebris ? 'bg-[#FF4D5E] text-[#050B16]' : 'bg-[#071426] text-[#8295AC] border border-[#1A3450]'
                }`}
              >
                {showDebris ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
              <div>
                <div className="font-semibold text-[#E8F0FA]">Space Environment Stars</div>
                <div className="text-[10px] text-[#8295AC]">3,000 particle celestial background starfield</div>
              </div>
              <span className="text-[#00D69A] font-bold">OPTIMIZED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backend & Deployment Architecture Diagnostics */}
      <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-4">
        <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-[#00D5FF]" />
          <span>System Diagnostics & Isolation Boundary</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[11px]">
          <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] space-y-1">
            <div className="text-[9px] text-[#8295AC] uppercase">Database Persistence</div>
            <div className="text-[#00D69A] font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>SQLAlchemy 2.0 (Alembic)</span>
            </div>
            <div className="text-[10px] text-[#8295AC]">SQLite local / Postgres prod</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] space-y-1">
            <div className="text-[9px] text-[#8295AC] uppercase">Real-Time WebSocket</div>
            <div className="text-[#00D69A] font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{isWsConnected ? "CONNECTED (/ws/v1)" : "DISCONNECTED"}</span>
            </div>
            <div className="text-[10px] text-[#8295AC]">Non-blocking tick broadcasts</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] space-y-1">
            <div className="text-[9px] text-[#8295AC] uppercase">Scientific Engine</div>
            <div className="text-[#00D5FF] font-bold">Python 3.12 / NumPy / SciPy</div>
            <div className="text-[10px] text-[#8295AC]">API Status: {health?.status || 'HEALTHY'}</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] space-y-1">
            <div className="text-[9px] text-[#8295AC] uppercase">Safety Mode</div>
            <div className="text-[#FFB547] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFB547]" />
              <span>SIMULATION ISOLATED</span>
            </div>
            <div className="text-[10px] text-[#8295AC]">No hardware radio uplink</div>
          </div>
        </div>
      </div>
    </div>
  );
};
