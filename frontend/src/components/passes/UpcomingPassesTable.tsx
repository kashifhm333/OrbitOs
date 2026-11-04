import React, { useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { PassRecord } from '../../types';

export const UpcomingPassesTable: React.FC = () => {
  const { selectedSatelliteId, satellites } = useOrbitStore();
  const [passes, setPasses] = useState<PassRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';

  const fetchPasses = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/passes/${satId}?horizon_hours=24`);
      if (resp.ok) {
        const data = await resp.json();
        setPasses(data.passes || []);
      }
    } catch (err) {
      console.error('Failed to fetch contact passes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
    const interval = setInterval(fetchPasses, 15000);
    return () => clearInterval(interval);
  }, [satId]);

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] uppercase tracking-[0.15em] text-[#8295AC] font-semibold flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-[#00D5FF]" />
          <span>Upcoming Passes (Next 24h) — {satellites[satId]?.name || satId}</span>
        </h4>
        <button 
          onClick={fetchPasses}
          className="text-[10px] text-[#00D5FF] hover:text-cyan-300 font-mono flex items-center gap-1"
          title="Refresh Predicted Passes"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="bg-[#0B1B2E] border-b border-[#1A3450]">
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em] text-[#8295AC] font-medium">Station</th>
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em] text-[#8295AC] font-medium">AOS (UTC)</th>
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em] text-[#8295AC] font-medium">LOS (UTC)</th>
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em] text-[#8295AC] font-medium">Duration</th>
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em] text-[#8295AC] font-medium">Max Elev.</th>
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-[0.1em] text-[#8295AC] font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {passes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-[#8295AC] text-xs">
                  {loading ? 'Calculating topocentric pass geometry...' : 'No upcoming ground passes detected within 24h horizon.'}
                </td>
              </tr>
            ) : (
              passes.slice(0, 5).map((p, i) => (
                <tr key={`${p.ground_station_id}-${i}`} className="border-t border-[#1A3450]/50 hover:bg-[#10243B]/40 transition-colors">
                  <td className="px-3 py-1.5 text-[#E8F0FA] font-medium">{p.ground_station_name}</td>
                  <td className="px-3 py-1.5 text-[#00D5FF]">{new Date(p.aos_epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}</td>
                  <td className="px-3 py-1.5 text-[#8295AC]">{new Date(p.los_epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}</td>
                  <td className="px-3 py-1.5 text-[#E8F0FA]">{p.duration_formatted}</td>
                  <td className="px-3 py-1.5 text-[#00D69A]">{p.max_elevation_deg.toFixed(1)}°</td>
                  <td className="px-3 py-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/30">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
