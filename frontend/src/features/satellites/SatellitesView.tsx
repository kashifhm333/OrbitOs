import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { SatelliteEntity } from '../../types';

const TelemetrySparkline: React.FC<{ soc: number; voltage?: number; inEclipse?: boolean }> = ({ soc, voltage = 28.2, inEclipse = false }) => {
  const pts = [
    Math.max(0, soc - (inEclipse ? 2.5 : -2.0)),
    Math.max(0, soc - (inEclipse ? 1.8 : -1.5)),
    Math.max(0, soc - (inEclipse ? 1.2 : -1.0)),
    Math.max(0, soc - (inEclipse ? 0.6 : -0.5)),
    soc
  ];
  const min = Math.min(...pts) - 5;
  const max = Math.max(...pts) + 5;
  const w = 64;
  const h = 20;

  const polyPoints = pts.map((val, idx) => {
    const x = (idx / (pts.length - 1)) * w;
    const y = h - ((val - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const lastY = h - ((pts[pts.length - 1] - min) / (max - min || 1)) * (h - 4) - 2;

  return (
    <div className="flex items-center gap-2 select-none">
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          fill="none"
          stroke={inEclipse ? "#FFB547" : "#00D5FF"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyPoints}
        />
        <circle
          cx={w}
          cy={lastY}
          r="2"
          fill="#00D69A"
        />
      </svg>
      <div className="text-[9px] font-mono leading-tight">
        <div className="text-[#00D69A]">{voltage.toFixed(1)}V</div>
        <div className="text-[#8295AC]">{soc.toFixed(0)}%</div>
      </div>
    </div>
  );
};

export const SatellitesView: React.FC = () => {
  const { selectedSatelliteId, setSelectedSatellite } = useOrbitStore();
  const [satellites, setSatellites] = useState<SatelliteEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);

  // Form states
  const [name, setName] = useState('OrbitOS-Delta (SAR)');
  const [dryMass, setDryMass] = useState(250.0);
  const [propellantMass, setPropellantMass] = useState(25.0);
  const [semiMajorAxisKm, setSemiMajorAxisKm] = useState(6928.137);
  const [inclinationDeg, setInclinationDeg] = useState(98.2);
  const [eccentricity, setEccentricity] = useState(0.001);

  const fetchSatellites = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/satellites');
      if (resp.ok) {
        setSatellites(await resp.json());
      }
    } catch (err) {
      console.error('Failed to fetch satellites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSatellites();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/v1/satellites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          dry_mass_kg: Number(dryMass),
          propellant_mass_kg: Number(propellantMass),
          semi_major_axis_km: Number(semiMajorAxisKm),
          eccentricity: Number(eccentricity),
          inclination_deg: Number(inclinationDeg),
          raan_deg: 0.0,
          arg_periapsis_deg: 0.0,
          true_anomaly_deg: 0.0
        })
      });
      if (resp.ok) {
        setShowDeployModal(false);
        await fetchSatellites();
      }
    } catch (err) {
      console.error('Error deploying satellite:', err);
    }
  };

  const handleStateChange = async (satId: string, newState: string) => {
    try {
      const resp = await fetch(`/api/v1/satellites/${satId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operational_state: newState })
      });
      if (resp.ok) {
        await fetchSatellites();
      }
    } catch (err) {
      console.error('Error updating state:', err);
    }
  };

  const handleDelete = async (satId: string) => {
    if (!window.confirm(`Are you sure you want to decommission and delete satellite ${satId}?`)) return;
    try {
      const resp = await fetch(`/api/v1/satellites/${satId}`, { method: 'DELETE' });
      if (resp.ok) {
        await fetchSatellites();
      }
    } catch (err) {
      console.error('Error deleting satellite:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#00D5FF]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">CONSTELLATION FLEET MANAGEMENT</h1>
            <p className="text-[11px] text-[#8295AC]">Active LEO space assets, mass specifications, and lifecycle management.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSatellites}
            className="px-3 py-1.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC] hover:text-[#E8F0FA] flex items-center gap-1.5"
            title="Refresh Fleet List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowDeployModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Satellite</span>
          </button>
        </div>
      </div>

      {/* Fleet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase tracking-wider">Total Constellation</div>
          <div className="text-2xl font-bold text-[#E8F0FA]">{satellites.length}</div>
          <div className="text-[10px] text-[#00D69A]">Active Simulated Orbiters</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase tracking-wider">Operational Nominal</div>
          <div className="text-2xl font-bold text-[#00D69A]">
            {satellites.filter(s => s.operational_state === 'ACTIVE').length}
          </div>
          <div className="text-[10px] text-[#8295AC]">Fully Mission Ready</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase tracking-wider">Safe Hold / Degraded</div>
          <div className="text-2xl font-bold text-[#FFB547]">
            {satellites.filter(s => s.operational_state === 'SAFE_HOLD' || s.operational_state === 'DEGRADED').length}
          </div>
          <div className="text-[10px] text-[#8295AC]">Contingency Mode</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-1">
          <div className="text-[10px] text-[#8295AC] uppercase tracking-wider">Average SoC</div>
          <div className="text-2xl font-bold text-[#00D5FF]">
            {satellites.length ? Math.round(satellites.reduce((a, b) => a + b.battery_soc_pct, 0) / satellites.length) : 0}%
          </div>
          <div className="text-[10px] text-[#8295AC]">Fleet Battery Health</div>
        </div>
      </div>

      {/* Satellites Table */}
      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="bg-[#0B1B2E] border-b border-[#1A3450] text-[#8295AC] text-[10px] uppercase tracking-wider">
              <th className="px-4 py-3">ID / Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Semi-Major Axis</th>
              <th className="px-4 py-3">Inclination</th>
              <th className="px-4 py-3">Dry / Fuel Mass</th>
              <th className="px-4 py-3">Battery SoC</th>
              <th className="px-4 py-3">Telemetry Trend (1h)</th>
              <th className="px-4 py-3">Eclipse</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3450]/60">
            {satellites.map((sat) => {
              const isSelected = selectedSatelliteId === sat.id;
              const smaKm = (sat.semi_major_axis_m / 1000.0).toFixed(1);
              const incDeg = (sat.inclination_rad * (180.0 / Math.PI)).toFixed(1);

              return (
                <tr 
                  key={sat.id}
                  onClick={() => setSelectedSatellite(sat.id)}
                  className={`hover:bg-[#10243B]/60 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#10243B]/80 border-l-2 border-[#00D5FF]' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#E8F0FA] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${sat.in_eclipse ? 'bg-[#FFB547]' : 'bg-[#00D5FF]'}`} />
                      <span>{sat.name}</span>
                    </div>
                    <div className="text-[10px] text-[#8295AC]">{sat.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={sat.operational_state}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStateChange(sat.id, e.target.value)}
                      className="bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] text-[10px] rounded px-2 py-1 font-mono focus:border-[#00D5FF] outline-none"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="STANDBY">STANDBY</option>
                      <option value="SAFE_HOLD">SAFE_HOLD</option>
                      <option value="DEGRADED">DEGRADED</option>
                      <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[#E8F0FA]">{smaKm} km</td>
                  <td className="px-4 py-3 text-[#E8F0FA]">{incDeg}°</td>
                  <td className="px-4 py-3 text-[#8295AC]">
                    <div className="text-[#E8F0FA]">{sat.dry_mass_kg} kg dry</div>
                    <div className="text-[10px] text-[#FFB547]">{sat.propellant_mass_kg.toFixed(2)} kg fuel</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[#00D5FF] font-semibold">{sat.battery_soc_pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-20 bg-[#0B1B2E] rounded-full h-1 mt-1 overflow-hidden border border-[#1A3450]">
                      <div 
                        className={`h-full ${sat.battery_soc_pct > 50 ? 'bg-[#00D5FF]' : 'bg-[#FFB547]'}`}
                        style={{ width: `${sat.battery_soc_pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TelemetrySparkline soc={sat.battery_soc_pct} inEclipse={sat.in_eclipse} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                      sat.in_eclipse ? 'bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/30' : 'bg-[#00D69A]/15 text-[#00D69A] border border-[#00D69A]/30'
                    }`}>
                      {sat.in_eclipse ? 'UMBRA' : 'SUNLIT'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(sat.id)}
                      className="p-1.5 rounded-lg text-[#FF4D5E] hover:bg-[#FF4D5E]/15 border border-transparent hover:border-[#FF4D5E]/30 transition-all"
                      title="Decommission & Delete Satellite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071426] border border-[#1A3450] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A3450] pb-3">
              <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00D5FF]" />
                <span>Deploy New Simulated Satellite</span>
              </h3>
              <button 
                onClick={() => setShowDeployModal(false)}
                className="text-[#8295AC] hover:text-[#E8F0FA] font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeploy} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[#8295AC] block mb-1">Satellite Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Dry Mass (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={dryMass}
                    onChange={(e) => setDryMass(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Propellant Mass (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={propellantMass}
                    onChange={(e) => setPropellantMass(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Semi-Major Axis (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="6478"
                    max="42164"
                    value={semiMajorAxisKm}
                    onChange={(e) => setSemiMajorAxisKm(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Inclination (deg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="180"
                    value={inclinationDeg}
                    onChange={(e) => setInclinationDeg(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#8295AC] block mb-1">Eccentricity [0.0 - 0.9]</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.9"
                  value={eccentricity}
                  onChange={(e) => setEccentricity(Number(e.target.value))}
                  className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC] hover:text-[#E8F0FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 shadow-md shadow-cyan-500/20"
                >
                  Deploy Into Orbit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
