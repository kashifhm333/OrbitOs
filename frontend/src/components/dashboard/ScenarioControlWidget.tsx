import React, { useState } from 'react';
import { Play, Pause, RotateCcw, ShieldCheck, AlertTriangle, XOctagon, Sparkles, Crosshair, Minimize2, Maximize2 } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const ScenarioControlWidget: React.FC = () => {
  const { 
    clockState, 
    timeAcceleration, 
    scenarioState, 
    loadScenario, 
    setSelectedSatellite 
  } = useOrbitStore();
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const activeId = scenarioState?.scenario_id || 'nominal';
  const isCollision = scenarioState?.collision_detected || false;
  const status = scenarioState?.status || 'NOMINAL';

  const handleSelectScenario = async (id: string) => {
    setLoading(true);
    try {
      await loadScenario(id);
    } catch {
      // Backend offline: Client-side fallback for Vercel/demo mode
    } finally {
      setLoading(false);
    }

    // Client-side fallback setup for Vercel standalone preview
    if (id === 'nominal') {
      setSelectedSatellite('sat-clean');
      useOrbitStore.setState({
        selectedSatelliteId: 'sat-clean',
        scenarioState: {
          scenario_id: 'nominal',
          scenario_name: 'Scenario 1: Nominal Clean Launch',
          status: 'NOMINAL',
          collision_detected: false,
          message: 'Nominal orbit verified. Spacecraft in clean 650.0 km LEO orbit. Zero debris conjunctions detected. Orbit pathways completely clear.',
          closest_distance_m: 149200.0,
          impact_target: null,
          collision_point: null,
        },
        satellites: {
          'sat-clean': {
            satellite_id: 'sat-clean',
            name: 'OrbitOS-CleanFly',
            operational_state: 'ACTIVE',
            position_eci_m: [7028137.0, 0.0, 0.0],
            velocity_eci_mps: [0.0, 5326.0, 5326.0],
            battery_soc_pct: 100.0,
            propellant_mass_kg: 25.0,
            in_eclipse: false,
            subsystem_status: 'NOMINAL',
            anomaly_score: 0.0,
            bus_voltage_v: 28.4,
            bus_current_a: 3.8,
            battery_temp_c: 19.5,
            avionics_temp_c: 28.0,
            solar_power_w: 240.0,
            downlink_rate_mbps: 15.0,
            comm_link_active: true,
          },
        },
        formalInvariants: {
          summary: 'ALL PASS (10/10)',
          passed_count: 10,
          total_count: 10,
          is_violated: false,
          spec_inv_003: 'VERIFIED',
          spec_inv_004: 'VERIFIED',
          spec_inv_009: 'VERIFIED',
          spec_inv_010: 'ACTIVE',
        }
      });
    } else if (id === 'debris_strike') {
      setSelectedSatellite('sat-strike');
      useOrbitStore.setState({
        selectedSatelliteId: 'sat-strike',
        scenarioState: {
          scenario_id: 'debris_strike',
          scenario_name: 'Scenario 2: Orbital Debris Strike',
          status: 'CONVERGING',
          collision_detected: false,
          message: 'Satellite deployed at Altitude: 500.8 km, Inclination: 80.2°, RAAN: 2.86°. Converging on Cosmos 2251 debris path...',
          closest_distance_m: 9147.2,
          impact_target: 'Cosmos 2251 Fragment #4812',
          collision_point: null,
        },
        satellites: {
          'sat-strike': {
            satellite_id: 'sat-strike',
            name: 'OrbitOS-StrikeTarget',
            operational_state: 'ACTIVE',
            position_eci_m: [6878937.0, 0.0, 0.0],
            velocity_eci_mps: [0.0, 7612.0, 0.0],
            battery_soc_pct: 100.0,
            propellant_mass_kg: 25.0,
            in_eclipse: false,
            subsystem_status: 'NOMINAL',
            anomaly_score: 0.05,
            bus_voltage_v: 28.4,
            bus_current_a: 3.8,
            battery_temp_c: 20.0,
            avionics_temp_c: 29.0,
            solar_power_w: 240.0,
            downlink_rate_mbps: 15.0,
            comm_link_active: true,
          },
        },
      });
    } else if (id === 'sat_collision') {
      setSelectedSatellite('sat-crosser');
      useOrbitStore.setState({
        selectedSatelliteId: 'sat-crosser',
        scenarioState: {
          scenario_id: 'sat_collision',
          scenario_name: 'Scenario 3: Satellite Collision (Fail)',
          status: 'NOMINAL',
          collision_detected: false,
          message: 'Two spacecraft (Alpha & Crosser) on intersecting crossing tracks. Press Run Scenario to observe head-on collision.',
          closest_distance_m: 43100.0,
          impact_target: 'OrbitOS-Crosser',
          collision_point: null,
        },
        satellites: {
          'sat-alpha': {
            satellite_id: 'sat-alpha',
            name: 'OrbitOS-Alpha',
            operational_state: 'ACTIVE',
            position_eci_m: [4863581.0, 4863581.0, 0.0],
            velocity_eci_mps: [-3800.0, 3800.0, 5374.0],
            battery_soc_pct: 98.0,
            propellant_mass_kg: 20.0,
            in_eclipse: false,
            subsystem_status: 'NOMINAL',
            anomaly_score: 0.0,
            bus_voltage_v: 28.2,
            bus_current_a: 3.5,
            battery_temp_c: 19.5,
            avionics_temp_c: 28.0,
            solar_power_w: 240.0,
            downlink_rate_mbps: 15.0,
            comm_link_active: true,
          },
          'sat-crosser': {
            satellite_id: 'sat-crosser',
            name: 'OrbitOS-Crosser',
            operational_state: 'ACTIVE',
            position_eci_m: [4863581.0, 4863581.0, 0.0],
            velocity_eci_mps: [3800.0, -3800.0, -5374.0],
            battery_soc_pct: 95.0,
            propellant_mass_kg: 20.0,
            in_eclipse: false,
            subsystem_status: 'NOMINAL',
            anomaly_score: 0.0,
            bus_voltage_v: 28.2,
            bus_current_a: 3.5,
            battery_temp_c: 19.5,
            avionics_temp_c: 28.0,
            solar_power_w: 240.0,
            downlink_rate_mbps: 15.0,
            comm_link_active: true,
          },
        },
      });
    }
  };

  const handleSimControl = async (action: string, rate?: number) => {
    try {
      await fetch('/api/v1/simulations/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rate: rate ?? timeAcceleration }),
      });
    } catch {
      // Backend offline: update local store for standalone mode
    }

    if (action === 'PLAY') {
      useOrbitStore.setState({ clockState: 'RUNNING' });
    } else if (action === 'PAUSE') {
      useOrbitStore.setState({ clockState: 'PAUSED' });
    } else if (action === 'RESET') {
      useOrbitStore.setState({ clockState: 'READY' });
      handleSelectScenario(activeId);
    } else if (action === 'SET_SPEED' && rate) {
      useOrbitStore.setState({ timeAcceleration: rate });
    }
  };

  // Client-side scenario step ticker fallback when running without backend
  React.useEffect(() => {
    const store = useOrbitStore.getState();
    if (store.isWsConnected || clockState !== 'RUNNING') return;

    const interval = setInterval(() => {
      const current = useOrbitStore.getState();
      if (current.isWsConnected || current.clockState !== 'RUNNING' || !current.scenarioState) return;

      const sc = current.scenarioState;
      if (sc.collision_detected) return;

      if (sc.scenario_id === 'debris_strike') {
        const nextDist = Math.max(8.3, (sc.closest_distance_m || 9147.2) - 2284.7);
        if (nextDist <= 50.0) {
          useOrbitStore.setState({
            scenarioState: {
              ...sc,
              closest_distance_m: 8.3,
              collision_detected: true,
              status: 'COLLISION_IMPACT',
              collision_point: [6878937.0, 0.0, 0.0],
              message: 'COLLISION DETECTED: When you launch the satellite into this orbit (Altitude: 500.8 km, Inclination: 80.2°, RAAN: 2.86°), it directly strikes Cosmos 2251 Fragment #4812. Spacecraft destroyed / stuck at this collision node.',
            },
          });
        } else {
          useOrbitStore.setState({
            scenarioState: { ...sc, closest_distance_m: nextDist },
          });
        }
      } else if (sc.scenario_id === 'sat_collision') {
        const nextDist = Math.max(0.0, (sc.closest_distance_m || 43100.0) - 10775.0);
        if (nextDist <= 50.0) {
          useOrbitStore.setState({
            scenarioState: {
              ...sc,
              closest_distance_m: 0.0,
              collision_detected: true,
              status: 'TEST_FAILED',
              collision_point: [4863581.0, 4863581.0, 0.0],
              message: 'TEST FAILED: SATELLITE-TO-SATELLITE COLLISION! Hypervelocity impact between OrbitOS-Alpha and OrbitOS-Crosser at orbital intersection node (Altitude: 500.0 km). Mission test: FAILED.',
            },
          });
        } else {
          useOrbitStore.setState({
            scenarioState: { ...sc, closest_distance_m: nextDist },
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [clockState]);

  // --------------------------------------------------------------------------
  // MINIMIZED VIEW: Ultra-slim, non-intrusive floating HUD bar (38px height)
  // Leaves 100% of Earth, satellites, trajectories and collision point visible!
  // --------------------------------------------------------------------------
  if (isMinimized) {
    return (
      <div className="bg-[#071426]/90 backdrop-blur-md border border-[#1A3450] rounded-xl px-3 py-1.5 shadow-2xl flex flex-wrap items-center justify-between gap-2 font-mono text-xs select-none">
        {/* Scenario Pill & Status */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#00D5FF]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#E8F0FA] text-[11px] truncate max-w-[180px] sm:max-w-none">
              {scenarioState?.scenario_name || 'Flight Scenario'}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
              isCollision
                ? 'bg-[#FF4D5E]/20 text-[#FF4D5E] border border-[#FF4D5E]/30 animate-pulse'
                : status === 'COLLISION_IMPACT'
                ? 'bg-[#FFB547]/20 text-[#FFB547] border border-[#FFB547]/30'
                : 'bg-[#00D69A]/20 text-[#00D69A] border border-[#00D69A]/30'
            }`}>
              {status}
            </span>
          </div>
        </div>

        {/* Real-time Distance Readout */}
        {scenarioState?.closest_distance_m !== undefined && (
          <div className="flex items-center gap-1.5 text-[11px] bg-[#10243B] px-2.5 py-0.5 rounded border border-[#1A3450]">
            <Crosshair className="w-3.5 h-3.5 text-[#00D5FF]" />
            <span className="text-[#8295AC] hidden sm:inline">Separation:</span>
            <span className={`font-bold ${
              scenarioState.closest_distance_m < 50
                ? 'text-[#FF4D5E]'
                : scenarioState.closest_distance_m < 5000
                ? 'text-[#FFB547]'
                : 'text-[#00D69A]'
            }`}>
              {scenarioState.closest_distance_m < 1000
                ? `${scenarioState.closest_distance_m.toFixed(1)} m`
                : `${(scenarioState.closest_distance_m / 1000).toFixed(1)} km`}
            </span>
            {isCollision && <span className="text-[#FF4D5E] font-black uppercase tracking-wider">[IMPACT]</span>}
          </div>
        )}

        {/* Quick Controls & Expand Toggle */}
        <div className="flex items-center gap-1.5">
          {/* Quick Scenario Selector */}
          <select
            value={activeId}
            onChange={(e) => handleSelectScenario(e.target.value)}
            disabled={loading}
            className="bg-[#10243B] text-[#E8F0FA] border border-[#1A3450] rounded px-2 py-1 text-[11px] font-medium focus:outline-none focus:border-[#00D5FF] cursor-pointer"
          >
            <option value="nominal">1. Nominal Launch</option>
            <option value="debris_strike">2. Debris Strike</option>
            <option value="sat_collision">3. Sat Collision (Fail)</option>
          </select>

          {/* Run / Pause */}
          {clockState === 'RUNNING' ? (
            <button
              onClick={() => handleSimControl('PAUSE')}
              className="px-2.5 py-1 rounded-lg bg-[#FFB547] text-[#050B16] font-bold hover:bg-[#FFB547]/90 flex items-center gap-1 text-[11px] transition-all shadow-sm"
              title="Pause Simulation"
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={() => handleSimControl('PLAY')}
              className="px-2.5 py-1 rounded-lg bg-[#00D69A] text-[#050B16] font-bold hover:bg-[#00D69A]/90 flex items-center gap-1 text-[11px] transition-all shadow-sm animate-pulse"
              title="Run Scenario"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run</span>
            </button>
          )}

          {/* Reset */}
          <button
            onClick={() => {
              handleSimControl('RESET');
              handleSelectScenario(activeId);
            }}
            className="p-1 rounded text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B] transition-all"
            title="Reset Scenario"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Presets */}
          {[1, 5, 10].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSimControl('SET_SPEED', rate)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                timeAcceleration === rate
                  ? 'bg-[#00D5FF] text-[#050B16] font-bold'
                  : 'text-[#8295AC] hover:text-[#E8F0FA]'
              }`}
            >
              {rate}x
            </button>
          ))}

          <div className="w-px h-4 bg-[#1A3450] mx-0.5" />

          {/* Expand Button */}
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#10243B] hover:bg-[#1A3450] text-[#00D5FF] text-[10px] font-bold border border-[#00D5FF]/30 transition-all shadow-sm"
            title="Expand scenario cards and full details"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:inline">Expand</span>
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // EXPANDED VIEW: Detailed scenario cards with explicit "Minimize" button
  // --------------------------------------------------------------------------
  return (
    <div className="bg-[#071426]/95 backdrop-blur-md border border-[#1A3450] rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2.5 font-mono text-xs select-none">
      {/* Top Header & Scenario Selection Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1A3450] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#00D5FF]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
              <span>Mission Flight Scenarios</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-[#00D5FF]/15 text-[#00D5FF] rounded">AUTOMATED</span>
            </div>
            <div className="text-[10px] text-[#8295AC]">Select scenario and press Run to execute automatically</div>
          </div>
        </div>

        {/* Playback Controls & Minimize Toggle */}
        <div className="flex items-center gap-1.5 bg-[#0B1B2E] border border-[#1A3450] px-2 py-1 rounded-xl shrink-0 self-end sm:self-auto">
          {clockState === 'RUNNING' ? (
            <button
              onClick={() => handleSimControl('PAUSE')}
              className="px-2.5 py-1 rounded-lg bg-[#FFB547] text-[#050B16] font-bold hover:bg-[#FFB547]/90 flex items-center gap-1 text-[11px] transition-all shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={() => handleSimControl('PLAY')}
              className="px-2.5 py-1 rounded-lg bg-[#00D69A] text-[#050B16] font-bold hover:bg-[#00D69A]/90 flex items-center gap-1 text-[11px] transition-all shadow-md shadow-emerald-500/20 active:scale-95 animate-pulse"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run Scenario</span>
            </button>
          )}

          <button
            onClick={() => {
              handleSimControl('RESET');
              handleSelectScenario(activeId);
            }}
            className="p-1 rounded-lg text-[#8295AC] hover:text-[#E8F0FA] hover:bg-[#10243B] transition-all"
            title="Reset Scenario to Initial State"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          <div className="w-px h-3.5 bg-[#1A3450] mx-0.5" />

          {/* Speed Presets */}
          {[1, 5, 10].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSimControl('SET_SPEED', rate)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                timeAcceleration === rate
                  ? 'bg-[#00D5FF] text-[#050B16] font-bold'
                  : 'text-[#8295AC] hover:text-[#E8F0FA]'
              }`}
            >
              {rate}x
            </button>
          ))}

          <div className="w-px h-3.5 bg-[#1A3450] mx-0.5" />

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#10243B] hover:bg-[#1A3450] text-[#00D5FF] text-[10px] font-bold border border-[#00D5FF]/30 transition-all shadow-sm"
            title="Minimize panel to unblock full 3D satellite view"
          >
            <Minimize2 className="w-3 h-3" />
            <span>Minimize</span>
          </button>
        </div>
      </div>

      {/* 3 Scenario Selection Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Scenario 1 */}
        <button
          onClick={() => handleSelectScenario('nominal')}
          disabled={loading}
          className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            activeId === 'nominal'
              ? 'bg-[#00D69A]/15 border-[#00D69A] shadow-md shadow-emerald-500/10'
              : 'bg-[#0B1B2E] border-[#1A3450] hover:border-[#00D69A]/50 text-[#8295AC]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[#E8F0FA] text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00D69A]" />
              <span>1. Nominal Clean Launch</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#00D69A]/20 text-[#00D69A]">SAFE</span>
          </div>
          <p className="text-[10px] text-[#8295AC] leading-tight">
            Launch into safe 650 km LEO orbit. No debris collisions, everything smooth.
          </p>
        </button>

        {/* Scenario 2 */}
        <button
          onClick={() => handleSelectScenario('debris_strike')}
          disabled={loading}
          className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            activeId === 'debris_strike'
              ? 'bg-[#FFB547]/15 border-[#FFB547] shadow-md shadow-amber-500/10'
              : 'bg-[#0B1B2E] border-[#1A3450] hover:border-[#FFB547]/50 text-[#8295AC]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[#E8F0FA] text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FFB547]" />
              <span>2. Debris Collision Strike</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#FFB547]/20 text-[#FFB547]">HAZARD</span>
          </div>
          <p className="text-[10px] text-[#8295AC] leading-tight">
            Launch at 500.8 km altitude. Directly intersects Cosmos 2251 debris path & strikes.
          </p>
        </button>

        {/* Scenario 3 */}
        <button
          onClick={() => handleSelectScenario('sat_collision')}
          disabled={loading}
          className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
            activeId === 'sat_collision'
              ? 'bg-[#FF4D5E]/15 border-[#FF4D5E] shadow-md shadow-rose-500/10'
              : 'bg-[#0B1B2E] border-[#1A3450] hover:border-[#FF4D5E]/50 text-[#8295AC]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[#E8F0FA] text-xs flex items-center gap-1.5">
              <XOctagon className="w-3.5 h-3.5 text-[#FF4D5E]" />
              <span>3. Satellite Collision (Fail)</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#FF4D5E]/20 text-[#FF4D5E]">FAIL TEST</span>
          </div>
          <p className="text-[10px] text-[#8295AC] leading-tight">
            Two satellites on intersecting crossing tracks collide head-on. Test failed.
          </p>
        </button>
      </div>

      {/* Real-Time Outcome & Diagnostic Results Card */}
      <div className={`p-2.5 rounded-xl border transition-all ${
        status === 'COLLISION_IMPACT'
          ? 'bg-[#FFB547]/10 border-[#FFB547] text-[#E8F0FA]'
          : status === 'TEST_FAILED'
          ? 'bg-[#FF4D5E]/15 border-[#FF4D5E] text-[#E8F0FA] animate-pulse'
          : 'bg-[#0B1B2E] border-[#1A3450] text-[#E8F0FA]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              isCollision
                ? 'bg-[#FF4D5E] animate-ping'
                : clockState === 'RUNNING'
                ? 'bg-[#00D69A] animate-pulse'
                : 'bg-[#8295AC]'
            }`} />
            <span className="font-bold text-xs uppercase tracking-wider text-[#00D5FF]">
              {scenarioState?.scenario_name || 'Operational Scenario'}
            </span>
          </div>

          {/* Proximity / Distance readout */}
          {scenarioState?.closest_distance_m !== undefined && (
            <div className="flex items-center gap-2 text-[11px] bg-[#10243B] px-2 py-0.5 rounded border border-[#1A3450]">
              <Crosshair className="w-3.5 h-3.5 text-[#00D5FF]" />
              <span className="text-[#8295AC]">Relative Distance:</span>
              <span className={`font-bold ${
                scenarioState.closest_distance_m < 50
                  ? 'text-[#FF4D5E]'
                  : scenarioState.closest_distance_m < 5000
                  ? 'text-[#FFB547]'
                  : 'text-[#00D69A]'
              }`}>
                {scenarioState.closest_distance_m < 1000
                  ? `${scenarioState.closest_distance_m.toFixed(1)} meters`
                  : `${(scenarioState.closest_distance_m / 1000).toFixed(1)} km`}
              </span>
              {isCollision && <span className="text-[#FF4D5E] font-black uppercase tracking-wider">[IMPACT]</span>}
            </div>
          )}
        </div>

        {/* Narrative Outcome Statement */}
        <p className="text-[11px] leading-relaxed text-[#E8F0FA]/90">
          {scenarioState?.message || 'Ready. Press Run Scenario to observe.'}
        </p>
      </div>
    </div>
  );
};
