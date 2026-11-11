import React, { useState, useEffect } from 'react';
import { ShieldAlert, Crosshair, AlertTriangle, Zap, CheckCircle2, Flame, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { ManeuverCandidate } from '../../types';
import { BPlaneRICPlot } from '../../components/visualization/BPlaneRICPlot';

export const ConjunctionsView: React.FC = () => {
  const { selectedSatelliteId, setSelectedSatellite, satellites, activeAlerts, setPreviewManeuver } = useOrbitStore();
  const [screening, setScreening] = useState(false);
  const [candidates, setCandidates] = useState<ManeuverCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<any>(null);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';
  const sat = satellites[satId];

  // Screen for close approaches
  const handleTriggerScreening = async () => {
    setScreening(true);
    try {
      const resp = await fetch('/api/conjunctions/screen-all', { method: 'POST' });
      if (resp.ok) {
        // Trigger candidates generation immediately for the primary satellite
        await handleGenerateCandidates();
      }
    } catch (err) {
      console.error('Screening failed:', err);
    } finally {
      setScreening(false);
    }
  };

  // Generate candidates
  const handleGenerateCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const resp = await fetch(`/api/maneuvers/plan/${satId}?nominal_dv_mps=1.5`, { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Failed to generate maneuver candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    handleGenerateCandidates();
  }, [satId]);

  // Operator approval
  const handleApprove = async (planId: string) => {
    try {
      const resp = await fetch(`/api/maneuvers/${planId}/approve`, { method: 'POST' });
      if (resp.ok) {
        await handleGenerateCandidates();
      }
    } catch (err) {
      console.error('Error approving plan:', err);
    }
  };

  // Execute burn
  const handleExecuteBurn = async (planId: string) => {
    if (!window.confirm("CONFIRMATION REQUIRED: Execute simulated thruster burn? This will consume propellant and adjust the satellite's orbital trajectory.")) {
      return;
    }
    setExecuting(true);
    try {
      const resp = await fetch(`/api/maneuvers/${planId}/execute`, { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        setLastExecutionResult(data);
        await handleGenerateCandidates();
      }
    } catch (err) {
      console.error('Error executing burn:', err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF4D5E]/10 border border-[#FF4D5E]/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-[#FF4D5E]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">COLLISION SCREENING & AUTONOMOUS MANEUVER PLANNER</h1>
            <p className="text-[11px] text-[#8295AC]">3-Tier geometric conjunction filter, miss-distance prediction, and Tsiolkovsky delta-v planning.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerScreening}
            disabled={screening}
            className="px-3.5 py-1.5 rounded-lg bg-[#FFB547] text-[#050B16] font-bold hover:bg-[#FFB547]/90 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${screening ? 'animate-spin' : ''}`} />
            <span>Screen Fleet (24h)</span>
          </button>
          <button
            onClick={handleGenerateCandidates}
            disabled={loadingCandidates}
            className="px-3.5 py-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Generate Burn Options</span>
          </button>
        </div>
      </div>

      {/* Conjunction Hazards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-[#FF4D5E]" />
            <span>Flagged Close Approach Hazards ({activeAlerts.length})</span>
          </h2>
          <span className="text-[10px] text-[#8295AC]">Screening Horizon: 24.0 Hours</span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] flex items-center gap-3 text-[#00D69A]">
            <CheckCircle2 className="w-5 h-5 text-[#00D69A] shrink-0" />
            <div>
              <div className="font-semibold text-xs">All Orbits Clear</div>
              <div className="text-[10px] text-[#8295AC]">No close approaches detected within the 50 km warning threshold.</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlerts.map((hazard) => {
              const isCrit = hazard.risk_level === 'CRITICAL';
              return (
                <div 
                  key={hazard.id} 
                  className={`p-4 rounded-xl border ${
                    isCrit ? 'bg-[#FF4D5E]/10 border-[#FF4D5E]/40' : 'bg-[#FFB547]/10 border-[#FFB547]/40'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#E8F0FA] flex items-center gap-1.5">
                      <AlertTriangle className={`w-4 h-4 ${isCrit ? 'text-[#FF4D5E]' : 'text-[#FFB547]'}`} />
                      <span>{hazard.title}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCrit ? 'bg-[#FF4D5E] text-[#050B16]' : 'bg-[#FFB547] text-[#050B16]'
                    }`}>
                      {hazard.risk_level}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#8295AC] text-[11px]">
                    <span>Predicted Miss Distance:</span>
                    <span className="text-[#E8F0FA] font-bold">{hazard.miss_distance_m} m</span>
                  </div>
                  <div className="flex justify-between text-[#8295AC] text-[10px]">
                    <span>Time of Closest Approach:</span>
                    <span>{new Date(hazard.epoch).toUTCString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Maneuver Execution Confirmation Banner */}
      {lastExecutionResult && (
        <div className="p-4 rounded-xl bg-[#00D69A]/15 border border-[#00D69A]/40 text-[#00D69A] space-y-1">
          <div className="font-bold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Maneuver Burn Executed Successfully</span>
          </div>
          <div className="text-[11px] text-[#E8F0FA]">
            {lastExecutionResult.message} Propellant Remaining: <span className="text-[#00D5FF] font-bold">{lastExecutionResult.propellant_remaining_kg} kg</span> | Post-Burn SMA: {lastExecutionResult.post_burn_semi_major_axis_m} m.
          </div>
        </div>
      )}

      {/* Target Satellite Switcher */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8295AC] uppercase font-semibold">Active Assessment Satellite:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(satellites).map((s) => (
              <button
                key={s.satellite_id}
                onClick={() => setSelectedSatellite(s.satellite_id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  satId === s.satellite_id
                    ? 'bg-[#00D5FF] text-[#050B16] font-bold shadow-sm shadow-cyan-500/20'
                    : 'bg-[#0B1B2E] text-[#8295AC] hover:text-[#E8F0FA] border border-[#1A3450]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[10px] text-[#00D5FF]">Propellant: {sat?.propellant_mass_kg?.toFixed(1) || '—'} kg</span>
      </div>

      {/* Maneuver Candidate Solutions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#00D5FF]" />
            <span>Autonomous Evasion Candidates — {sat?.name || satId}</span>
          </h2>
          <span className="text-[10px] text-[#8295AC]">Tsiolkovsky Rocket Equation (Isp = 220s)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {candidates.map((cand) => {
            const isApproved = cand.is_approved;
            const isNoAction = cand.maneuver_type === 'NO_ACTION';

            return (
              <div
                key={cand.id}
                onMouseEnter={() => setPreviewManeuver(cand)}
                onMouseLeave={() => setPreviewManeuver(null)}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  isApproved
                    ? 'bg-[#10243B] border-[#00D69A] shadow-lg shadow-emerald-500/10'
                    : 'bg-[#071426] border-[#1A3450] hover:border-[#00D5FF]/60 hover:shadow-lg hover:shadow-cyan-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#E8F0FA] text-sm">{cand.description || cand.strategy || 'Maneuver Burn'}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0B1B2E] text-[#00D5FF] border border-[#1A3450]">
                      {cand.maneuver_type || cand.strategy}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    cand.status === 'ARMED' ? 'bg-[#00D69A] text-[#050B16]' :
                    cand.status === 'EXECUTED' ? 'bg-[#10243B] text-[#8295AC] border border-[#1A3450]' :
                    'bg-[#0B1B2E] text-[#8295AC] border border-[#1A3450]'
                  }`}>
                    {cand.status}
                  </span>
                </div>

                {/* Miniature 2D RIC B-Plane Plot */}
                <BPlaneRICPlot
                  missDistanceM={cand.projected_miss_distance_m}
                  deltaVMps={cand.delta_v_total_mps ?? cand.delta_v_magnitude_mps ?? 0}
                  strategy={cand.strategy || cand.maneuver_type}
                  isNoAction={isNoAction}
                />

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#0B1B2E] border border-[#1A3450]">
                    <div className="text-[9px] text-[#8295AC] uppercase">Delta-V</div>
                    <div className="font-semibold text-[#00D5FF]">{(cand.delta_v_total_mps ?? cand.delta_v_magnitude_mps ?? 0).toFixed(2)} m/s</div>
                  </div>
                  <div className="p-2 rounded bg-[#0B1B2E] border border-[#1A3450]">
                    <div className="text-[9px] text-[#8295AC] uppercase">Fuel Consumed</div>
                    <div className="font-semibold text-[#FFB547]">{(cand.required_fuel_kg ?? 0).toFixed(3)} kg</div>
                  </div>
                  <div className="p-2 rounded bg-[#0B1B2E] border border-[#1A3450]">
                    <div className="text-[9px] text-[#8295AC] uppercase">Projected Miss</div>
                    <div className="font-semibold text-[#00D69A]">{cand.projected_miss_distance_m ? `${(cand.projected_miss_distance_m / 1000).toFixed(1)} km` : 'Nominal'}</div>
                  </div>
                </div>

                <div className="text-[10px] text-[#8295AC] flex justify-between pt-1">
                  <span>Burn Duration: {cand.burn_duration_seconds ?? 5}s</span>
                  <span>Feasible: {cand.is_feasible ? 'YES' : 'NO (MARGIN EXCEEDED)'}</span>
                </div>

                {/* Workflow Buttons */}
                {!isNoAction && (
                  <div className="pt-2 border-t border-[#1A3450] flex items-center justify-end gap-2">
                    {!isApproved ? (
                      <button
                        onClick={() => handleApprove(cand.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/30 hover:bg-[#00D5FF]/25 font-semibold transition-all"
                      >
                        Arm / Operator Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleExecuteBurn(cand.id)}
                        disabled={executing}
                        className="px-4 py-1.5 rounded-lg bg-[#00D69A] text-[#050B16] font-bold hover:bg-[#00D69A]/90 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Execute Thruster Burn</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
