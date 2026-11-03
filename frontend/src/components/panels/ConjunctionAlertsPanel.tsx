import React from 'react';
import { AlertTriangle, ShieldCheck, Crosshair } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const ConjunctionAlertsPanel: React.FC = () => {
  const { activeAlerts } = useOrbitStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-space-700">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Conjunction Safety & Collision Alerts</span>
        </h3>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
          activeAlerts.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          {activeAlerts.length} HAZARD(S)
        </span>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="p-3 rounded-xl bg-space-800/40 border border-space-700/60 flex items-center space-x-3 text-xs text-slate-300 font-mono">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>No close approach events detected within 24-hour screening horizon ($d &gt; 50\text&#123; km&#125;$).</span>
        </div>
      ) : (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-xs font-mono space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-red-400 flex items-center space-x-1.5">
                  <Crosshair className="w-4 h-4 animate-spin text-red-500" />
                  <span>{alert.title}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 font-bold text-[10px]">
                  {alert.risk_level}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>ESTIMATED MISS DISTANCE:</span>
                <span className="text-white font-bold">{alert.miss_distance_m} m</span>
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => window.alert("Simulation Maneuver Planning triggered. See 09-autonomous-maneuver-planning.md")}
                  className="px-2.5 py-1 rounded bg-red-500/30 hover:bg-red-500/50 text-red-200 border border-red-500/40 text-[11px] font-medium transition-all"
                >
                  Generate Evasion Burn Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
