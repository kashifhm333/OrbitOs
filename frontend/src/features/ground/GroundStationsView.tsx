import React, { useState, useEffect } from 'react';
import { Radio, MapPin, Plus, Wifi, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { GroundStationItem, PassRecord } from '../../types';

export const GroundStationsView: React.FC = () => {
  const { selectedSatelliteId, satellites } = useOrbitStore();
  const [stations, setStations] = useState<GroundStationItem[]>([]);
  const [visibility, setVisibility] = useState<any[]>([]);
  const [passes, setPasses] = useState<PassRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('Tokyo Tracking Station');
  const [latitude, setLatitude] = useState(35.6762);
  const [longitude, setLongitude] = useState(139.6503);
  const [altitude, setAltitude] = useState(40.0);
  const [minElevation, setMinElevation] = useState(10.0);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';

  const fetchStations = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/ground-stations');
      if (resp.ok) {
        setStations(await resp.json());
      }
    } catch (err) {
      console.error('Failed to fetch stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusAndPasses = async () => {
    try {
      const [visResp, passResp] = await Promise.all([
        fetch('/api/ground-stations/status'),
        fetch(`/api/v1/passes/${satId}?horizon_hours=24`)
      ]);
      if (visResp.ok) {
        const data = await visResp.json();
        setVisibility(data.visibility || []);
      }
      if (passResp.ok) {
        const data = await passResp.json();
        setPasses(data.passes || []);
      }
    } catch (err) {
      console.error('Failed to refresh ground network data:', err);
    }
  };

  useEffect(() => {
    fetchStations();
    fetchStatusAndPasses();
    const interval = setInterval(fetchStatusAndPasses, 5000);
    return () => clearInterval(interval);
  }, [satId]);

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/ground-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          latitude_deg: Number(latitude),
          longitude_deg: Number(longitude),
          altitude_m: Number(altitude),
          min_elevation_deg: Number(minElevation)
        })
      });
      if (resp.ok) {
        setShowAddModal(false);
        await fetchStations();
        await fetchStatusAndPasses();
      }
    } catch (err) {
      console.error('Error adding station:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D69A]/10 border border-[#00D69A]/30 flex items-center justify-center">
            <Radio className="w-5 h-5 text-[#00D69A]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">GLOBAL TRACKING GROUND STATION NETWORK</h1>
            <p className="text-[11px] text-[#8295AC]">Topocentric coordinate transforms, contact window forecasting, and RF link margin.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchStations(); fetchStatusAndPasses(); }}
            className="px-3 py-1.5 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC] hover:text-[#E8F0FA] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ground Station</span>
          </button>
        </div>
      </div>

      {/* Real-time Link Status Matrix */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#00D5FF]" />
          <span>Real-Time Contact Visibility Matrix</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibility.filter(v => v.satellite_id === satId).map((v, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl border transition-all ${
                v.in_contact
                  ? 'bg-[#00D69A]/10 border-[#00D69A]/50 shadow-md shadow-emerald-500/10'
                  : 'bg-[#071426] border-[#1A3450]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#E8F0FA] truncate">{v.ground_station_name}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  v.in_contact ? 'bg-[#00D69A] text-[#050B16]' : 'bg-[#0B1B2E] text-[#8295AC]'
                }`}>
                  {v.in_contact ? 'IN CONTACT' : 'BELOW HORIZON'}
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-[#8295AC]">
                <div className="flex justify-between">
                  <span>Elevation:</span>
                  <span className={`font-semibold ${v.in_contact ? 'text-[#00D69A]' : 'text-[#8295AC]'}`}>
                    {v.elevation_deg.toFixed(1)}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Azimuth:</span>
                  <span className="text-[#E8F0FA]">{v.azimuth_deg.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span>Slant Range:</span>
                  <span className="text-[#E8F0FA]">{v.slant_range_km.toFixed(0)} km</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#1A3450]/60">
                  <span>Path Loss (FSPL):</span>
                  <span className="text-[#00D5FF]">{v.fspl_db.toFixed(1)} dB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configured Stations Table */}
      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <div className="px-4 py-3 bg-[#0B1B2E] border-b border-[#1A3450] font-bold text-[#E8F0FA] text-[11px] uppercase tracking-wider">
          Configured Earth Tracking Stations ({stations.length})
        </div>
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="bg-[#071426] border-b border-[#1A3450] text-[#8295AC] text-[9px] uppercase tracking-wider">
              <th className="px-4 py-3">Station Name</th>
              <th className="px-4 py-3">Station ID</th>
              <th className="px-4 py-3">Latitude</th>
              <th className="px-4 py-3">Longitude</th>
              <th className="px-4 py-3">Altitude</th>
              <th className="px-4 py-3">Min Elevation Mask</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3450]/40 text-[11px]">
            {stations.map((st) => (
              <tr key={st.id} className="hover:bg-[#10243B]/40 transition-colors">
                <td className="px-4 py-3 font-semibold text-[#E8F0FA] flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#00D5FF]" />
                  <span>{st.name}</span>
                </td>
                <td className="px-4 py-3 text-[#8295AC]">{st.id}</td>
                <td className="px-4 py-3 text-[#E8F0FA]">{st.latitude_deg.toFixed(4)}°</td>
                <td className="px-4 py-3 text-[#E8F0FA]">{st.longitude_deg.toFixed(4)}°</td>
                <td className="px-4 py-3 text-[#8295AC]">{st.altitude_m} m</td>
                <td className="px-4 py-3 text-[#00D69A]">{st.min_elevation_deg}°</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[#00D69A]/15 text-[#00D69A] border border-[#00D69A]/30">
                    OPERATIONAL
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upcoming Passes Table */}
      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <div className="px-4 py-3 bg-[#0B1B2E] border-b border-[#1A3450] font-bold text-[#E8F0FA] text-[11px] uppercase tracking-wider flex items-center justify-between">
          <span>Upcoming Station Passes for {satId} ({passes.length})</span>
          <span className="text-[10px] text-[#00D5FF]">Horizon: 24h</span>
        </div>
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="bg-[#071426] border-b border-[#1A3450] text-[#8295AC] text-[9px] uppercase tracking-wider">
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">AOS Epoch</th>
              <th className="px-4 py-3">LOS Epoch</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Max Elevation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3450]/40 text-[11px]">
            {passes.slice(0, 5).map((p, idx) => (
              <tr key={idx} className="hover:bg-[#10243B]/40 transition-colors">
                <td className="px-4 py-3 text-[#E8F0FA] font-semibold">{p.ground_station_name}</td>
                <td className="px-4 py-3 text-[#00D5FF]">{new Date(p.aos_epoch).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-[#8295AC]">{new Date(p.los_epoch).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-[#E8F0FA]">{Math.round(p.duration_seconds)}s</td>
                <td className="px-4 py-3 text-[#00D69A] font-semibold">{p.max_elevation_deg.toFixed(1)}°</td>
              </tr>
            ))}
            {passes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-[#8295AC]">No upcoming passes in 24h horizon</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Station Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#071426] border border-[#1A3450] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A3450] pb-3">
              <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00D5FF]" />
                <span>Register Tracking Ground Station</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8295AC] hover:text-[#E8F0FA]">✕</button>
            </div>

            <form onSubmit={handleAddStation} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[#8295AC] block mb-1">Station Name</label>
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
                  <label className="text-[10px] text-[#8295AC] block mb-1">Latitude (deg)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Longitude (deg)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Altitude (m)</label>
                  <input
                    type="number"
                    step="1"
                    value={altitude}
                    onChange={(e) => setAltitude(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8295AC] block mb-1">Min Elevation Mask (deg)</label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    max="45"
                    value={minElevation}
                    onChange={(e) => setMinElevation(Number(e.target.value))}
                    className="w-full bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] rounded-lg px-3 py-2 outline-none focus:border-[#00D5FF]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 shadow-md shadow-cyan-500/20"
                >
                  Register Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
