import React, { useState, useEffect } from 'react';
import { Radio, Wifi, WifiOff, MapPin } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

interface GroundStation {
  id: string;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  altitude_m: number;
  min_elevation_deg: number;
}

interface VisibilityItem {
  ground_station_id: string;
  ground_station_name: string;
  satellite_id: string;
  satellite_name: string;
  in_contact: boolean;
  elevation_deg: number;
  azimuth_deg: number;
  slant_range_km: number;
  fspl_db: number;
  downlink_rate_kbps: number;
}

interface PassItem {
  ground_station_id: string;
  ground_station_name: string;
  satellite_id: string;
  aos_epoch: string;
  los_epoch: string;
  max_elevation_deg: number;
  min_range_km: number;
  duration_seconds: number;
}

export const GroundStationPanel: React.FC = () => {
  const { selectedSatelliteId, satellites } = useOrbitStore();
  const [stations, setStations] = useState<GroundStation[]>([]);
  const [visibility, setVisibility] = useState<VisibilityItem[]>([]);
  const [passes, setPasses] = useState<PassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const resp = await fetch('/api/ground-stations');
        if (resp.ok) {
          const data = await resp.json();
          setStations(data);
        }
      } catch (err) {
        console.error('Failed to fetch stations:', err);
      }
    };
    fetchStations();
  }, []);

  const refreshPasses = async () => {
    setLoading(true);
    try {
      const [visResp, passResp] = await Promise.all([
        fetch('/api/ground-stations/status'),
        fetch(`/api/ground-stations/predict/${satId}?horizon_hours=12`)
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
      console.error('Failed to refresh ground station status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPasses();
    const interval = setInterval(refreshPasses, 5000);
    return () => clearInterval(interval);
  }, [satId]);

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between bg-space-900/80 p-3 rounded-xl border border-space-700">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-sm">GROUND NETWORK</span>
        </div>
        <button
          onClick={refreshPasses}
          disabled={loading}
          className="text-cyan-400 hover:underline text-[11px]"
        >
          {loading ? 'REFRESHING...' : 'REFRESH'}
        </button>
      </div>

      {/* Global Ground Stations List */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          PRIMARY TRACKING DISHES
        </div>

        <div className="grid grid-cols-1 gap-2">
          {stations.map((st) => {
            const currentVis = visibility.find(
              (v) => v.ground_station_id === st.id && (v.satellite_id === satId || v.satellite_id.toLowerCase() === satId.toLowerCase())
            );
            const inContact = currentVis?.in_contact ?? false;

            return (
              <div
                key={st.id}
                className={`p-3 rounded-xl border transition-all ${
                  inContact
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                    : 'bg-space-900/60 border-space-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold text-slate-200">{st.name}</span>
                  </div>
                  <span
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      inContact
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {inContact ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-slate-500" />}
                    <span>{inContact ? 'CARRIER LOCK' : 'OUT OF CONTACT'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 mt-2 bg-space-950/60 p-2 rounded-lg">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ELEVATION</span>
                    <span className={inContact ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                      {currentVis ? `${currentVis.elevation_deg}°` : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">AZIMUTH</span>
                    <span className="text-slate-300">{currentVis ? `${currentVis.azimuth_deg}°` : '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">RANGE</span>
                    <span className="text-slate-300">{currentVis ? `${currentVis.slant_range_km} km` : '--'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Predicted Passes */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
          <span>UPCOMING PASSES ({passes.length})</span>
          <span className="text-[10px] text-slate-500">12h Horizon</span>
        </div>

        {passes.length === 0 ? (
          <div className="p-4 rounded-xl bg-space-900/40 border border-space-800 text-center text-slate-500">
            No passes detected within current prediction horizon.
          </div>
        ) : (
          <div className="space-y-2">
            {passes.slice(0, 5).map((p, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-space-900/60 border border-space-700/80 space-y-1">
                <div className="flex justify-between items-center text-slate-200 font-semibold">
                  <span>{p.ground_station_name}</span>
                  <span className="text-cyan-400 text-[10px]">{Math.round(p.duration_seconds / 60)} min pass</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>AOS: {new Date(p.aos_epoch).toLocaleTimeString()}</span>
                  <span>LOS: {new Date(p.los_epoch).toLocaleTimeString()}</span>
                  <span className="text-emerald-400">Max El: {p.max_elevation_deg}°</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
