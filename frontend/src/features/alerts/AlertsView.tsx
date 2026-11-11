import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const AlertsView: React.FC = () => {
  const { recentEvents } = useOrbitStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/v1/alerts');
      if (resp.ok) {
        setAlerts(await resp.json());
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const resp = await fetch(`/api/v1/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (resp.ok) {
        await fetchAlerts();
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      const resp = await fetch('/api/v1/alerts/acknowledge-all', { method: 'POST' });
      if (resp.ok) {
        await fetchAlerts();
      }
    } catch (err) {
      console.error('Error acknowledging all warnings:', err);
    }
  };

  const filtered = filterSeverity === 'ALL'
    ? alerts
    : alerts.filter(a => a.severity.toUpperCase() === filterSeverity);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFB547]/10 border border-[#FFB547]/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#FFB547]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">MISSION CONTROL ALERTS & HAZARDS</h1>
            <p className="text-[11px] text-[#8295AC]">Active orbital conjunctions, subsystem threshold breaches, and flight director acknowledgments.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filters */}
          <div className="flex bg-[#0B1B2E] border border-[#1A3450] rounded-lg p-0.5">
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1 rounded text-[10px] font-semibold transition-all ${
                  filterSeverity === sev ? 'bg-[#00D5FF] text-[#050B16]' : 'text-[#8295AC] hover:text-[#E8F0FA]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Acknowledge All Warnings Button */}
          <button
            onClick={handleAcknowledgeAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFB547]/15 border border-[#FFB547]/40 text-[#FFB547] hover:bg-[#FFB547]/25 text-[10px] font-bold transition-all cursor-pointer shadow-sm shadow-amber-500/10"
            title="Acknowledge all non-critical warnings in a single click"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Acknowledge All Warnings</span>
          </button>

          <button
            onClick={fetchAlerts}
            className="p-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC] hover:text-[#E8F0FA]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FF4D5E]" />
          <span>Active Flagged Hazards ({filtered.length})</span>
        </h2>

        {filtered.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#071426] border border-[#1A3450] text-center text-[#00D69A] space-y-1">
            <CheckCircle className="w-6 h-6 mx-auto text-[#00D69A]" />
            <div className="font-bold text-sm">No Active Hazards Flagged</div>
            <div className="text-[11px] text-[#8295AC]">All constellation assets and subsystem states are nominal.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((al) => {
              const isCrit = al.severity === 'CRITICAL';
              const isWarn = al.severity === 'WARNING';
              const borderColor = isCrit ? 'border-[#FF4D5E]/60' : isWarn ? 'border-[#FFB547]/60' : 'border-[#00D5FF]/60';
              const bgColor = isCrit ? 'bg-[#FF4D5E]/10' : isWarn ? 'bg-[#FFB547]/10' : 'bg-[#071426]';

              return (
                <div 
                  key={al.id}
                  className={`p-4 rounded-xl border ${borderColor} ${bgColor} flex items-center justify-between gap-4 transition-all`}
                >
                  <div className="flex items-start gap-3">
                    {isCrit ? (
                      <AlertCircle className="w-5 h-5 text-[#FF4D5E] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-[#FFB547] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-[#E8F0FA]">{al.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isCrit ? 'bg-[#FF4D5E] text-[#050B16]' : 'bg-[#FFB547] text-[#050B16]'
                        }`}>
                          {al.severity}
                        </span>
                        <span className="text-[10px] text-[#8295AC]">Type: {al.alert_type}</span>
                        {al.relative_velocity_kms !== undefined && al.relative_velocity_kms !== null && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10243B] text-[#00D5FF] border border-[#1A3450]">
                            V_rel: {al.relative_velocity_kms} km/s
                          </span>
                        )}
                        {al.collision_probability !== undefined && al.collision_probability !== null && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#10243B] text-[#FF4D5E] border border-[#FF4D5E]/40 font-bold">
                            Pc: {al.collision_probability < 0.0001 ? al.collision_probability.toExponential(2) : al.collision_probability.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#E8F0FA]">{al.message}</p>
                      <div className="text-[10px] text-[#8295AC] mt-1">
                        Epoch: {new Date(al.epoch).toUTCString()}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {al.is_acknowledged ? (
                      <span className="px-3 py-1.5 rounded-lg bg-[#00D69A]/15 text-[#00D69A] border border-[#00D69A]/30 text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Acknowledged</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(al.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#FF4D5E] text-[#050B16] font-bold hover:bg-[#FF4D5E]/90 text-xs active:scale-95 transition-all shadow-md shadow-rose-500/20"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Simulation Event Stream */}
      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <div className="px-4 py-3 bg-[#0B1B2E] border-b border-[#1A3450] font-bold text-[#E8F0FA] text-[11px] uppercase tracking-wider flex items-center justify-between">
          <span>Simulation Operations Audit Stream</span>
          <span className="text-[10px] text-[#8295AC]">{recentEvents.length} Events</span>
        </div>
        <div className="divide-y divide-[#1A3450]/40 max-h-72 overflow-y-auto">
          {recentEvents.map((evt) => (
            <div key={evt.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-[#10243B]/40 text-[11px]">
              <div className="flex items-center gap-3">
                <span className="text-[#8295AC] text-[10px]">
                  [{new Date(evt.epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}]
                </span>
                <span className="text-[#E8F0FA]">{evt.title}</span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${
                evt.severity === 'CRITICAL' ? 'bg-[#FF4D5E]/20 text-[#FF4D5E]' :
                evt.severity === 'WARNING' ? 'bg-[#FFB547]/20 text-[#FFB547]' :
                'bg-[#00D5FF]/20 text-[#00D5FF]'
              }`}>
                {evt.event_type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
