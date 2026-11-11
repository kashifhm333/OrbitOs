import React, { useEffect, useState } from 'react';
import { Play, Pause, StepForward, RotateCcw, Radio, ShieldAlert, Clock, AlertTriangle, UserCheck, Sparkles, Search } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { SatelliteSelector } from '../satellite/SatelliteSelector';
import { NavPage } from './Sidebar';

interface TopbarProps {
  onNavigate?: (page: NavPage) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onNavigate }) => {
  const { 
    simulationEpoch, 
    clockState, 
    timeAcceleration, 
    timeScale,
    setTimeScale,
    tickNumber, 
    isWsConnected, 
    activeAlerts, 
    scenarioState, 
    loadScenario 
  } = useOrbitStore();
  const [apiConnected, setApiConnected] = useState(true);

  const cycleTimeScale = () => {
    if (timeScale === 'UTC') setTimeScale('TAI');
    else if (timeScale === 'TAI') setTimeScale('TDB');
    else setTimeScale('UTC');
  };

  const getDisplayEpochString = () => {
    const baseDate = new Date(simulationEpoch);
    let offsetMs = 0;
    if (timeScale === 'TAI') offsetMs = 37000;
    else if (timeScale === 'TDB') offsetMs = 69184;
    const adjustedDate = new Date(baseDate.getTime() + offsetMs);
    return adjustedDate.toUTCString().replace('GMT', timeScale);
  };

  // Check backend health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const resp = await fetch('/api/v1/health');
        setApiConnected(resp.ok);
      } catch {
        setApiConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (action: string, rate?: number) => {
    try {
      await fetch('/api/v1/simulations/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rate: rate ?? timeAcceleration }),
      });
    } catch (err) { console.error('Control error:', err); }
  };

  const handleScenarioChange = async (sid: string) => {
    try {
      await loadScenario(sid);
    } catch (err) {
      console.error('Scenario switch failed:', err);
    }
  };

  const alertCount = activeAlerts.length;

  return (
    <header className="h-14 bg-[#071426] border-b border-[#1A3450] px-4 flex items-center gap-3 z-20 shrink-0 select-none">
      {/* Brand */}
      <div 
        className="flex items-center gap-2 shrink-0 cursor-pointer"
        onClick={() => onNavigate?.('dashboard')}
      >
        <span className="font-bold text-base tracking-widest text-[#E8F0FA]">ORBIT<span className="text-[#00D5FF]">OS</span></span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10243B] text-[#00D5FF] font-mono border border-[#1A3450]">MISSION CONTROL</span>
      </div>

      <div className="w-px h-6 bg-[#1A3450] mx-1" />

      {/* Satellite Selector */}
      <SatelliteSelector />

      {/* Scenario Quick Selector */}
      <div className="hidden lg:flex items-center gap-1.5 bg-[#0B1B2E] border border-[#1A3450] px-2.5 py-1.5 rounded-lg text-xs font-mono">
        <Sparkles className="w-3.5 h-3.5 text-[#00D5FF]" />
        <span className="text-[#8295AC] hidden xl:inline">Scenario:</span>
        <select
          value={scenarioState?.scenario_id || 'nominal'}
          onChange={(e) => handleScenarioChange(e.target.value)}
          className="bg-[#10243B] text-[#E8F0FA] border border-[#1A3450] rounded px-2 py-0.5 text-xs font-medium focus:outline-none focus:border-[#00D5FF] cursor-pointer"
        >
          <option value="nominal">1: Nominal Safe Launch</option>
          <option value="debris_strike">2: Debris Collision Strike</option>
          <option value="sat_collision">3: Sat-to-Sat Collision (Fail)</option>
        </select>
      </div>

      {/* Command Palette Trigger */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
        className="hidden md:flex items-center gap-2 bg-[#0B1B2E] hover:bg-[#10243B] border border-[#1A3450] hover:border-[#00D5FF]/40 px-2.5 py-1.5 rounded-lg text-xs font-mono text-[#8295AC] transition-all cursor-pointer"
        title="Open Command Palette (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-[#00D5FF]" />
        <span>Commands</span>
        <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#10243B] text-[#8295AC] border border-[#1A3450]">
          ⌘K
        </kbd>
      </button>

      {/* Continuous Time Scale Clock Toggle */}
      <button
        onClick={cycleTimeScale}
        className="flex items-center gap-2 font-mono text-xs bg-[#0B1B2E] hover:bg-[#10243B] border border-[#1A3450] hover:border-[#00D5FF]/40 px-3 py-1.5 rounded-lg ml-auto transition-all cursor-pointer group"
        title="Click to toggle time scale: UTC ↔ TAI (+37s) ↔ TDB (+69s)"
      >
        <Clock className="w-3.5 h-3.5 text-[#00D5FF] group-hover:rotate-45 transition-transform" />
        <span className="text-[#00D5FF] font-semibold">{getDisplayEpochString()}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#00D5FF]/20 text-[#00D5FF] border border-[#00D5FF]/40 font-bold">
          {timeScale}
        </span>
        <span className="text-[#8295AC] ml-1">TICK #{tickNumber.toString().padStart(6, '0')}</span>
      </button>

      {/* Sim Controls */}
      <div className="flex items-center gap-1 bg-[#0B1B2E] border border-[#1A3450] px-2.5 py-1.5 rounded-lg">
        {clockState === 'RUNNING' ? (
          <button onClick={() => handleControl('PAUSE')} className="p-1.5 rounded-lg bg-[#FFB547]/20 text-[#FFB547] hover:bg-[#FFB547]/30 transition-all" title="Pause Simulation">
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={() => handleControl('PLAY')} className="p-1.5 rounded-lg bg-[#00D5FF] text-[#050B16] font-bold hover:bg-[#00D5FF]/90 transition-all shadow-sm shadow-cyan-500/20" title="Play Simulation">
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        )}
        <button onClick={() => handleControl('STEP')} className="p-1.5 rounded-lg text-[#8295AC] hover:bg-[#10243B] hover:text-[#E8F0FA] transition-all" title="Advance 1 Tick">
          <StepForward className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => handleControl('RESET')} className="p-1.5 rounded-lg text-[#8295AC] hover:bg-[#10243B] hover:text-[#E8F0FA] transition-all" title="Reset Simulation">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-[#1A3450] mx-1" />
        {[1, 5, 10, 50].map((r) => (
          <button 
            key={r} 
            onClick={() => handleControl('SET_SPEED', r)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${timeAcceleration === r ? 'bg-[#00D5FF]/20 text-[#00D5FF] border border-[#00D5FF]/40 font-bold' : 'text-[#8295AC] hover:bg-[#10243B] hover:text-[#E8F0FA]'}`}
          >
            {r}x
          </button>
        ))}

        <div className="w-px h-5 bg-[#1A3450] mx-1" />

        {/* Interactive Timeline Scrubber Slider */}
        <div className="hidden sm:flex items-center gap-1.5 px-1 bg-[#10243B]/60 rounded-md py-0.5 border border-[#1A3450]/40">
          <input
            type="range"
            min="0"
            max={Math.max(100, tickNumber)}
            value={tickNumber}
            onChange={(e) => {
              const targetTick = parseInt(e.target.value, 10);
              useOrbitStore.setState({ tickNumber: targetTick });
            }}
            className="w-14 lg:w-20 h-1 bg-[#1A3450] rounded-lg appearance-none cursor-pointer accent-[#00D5FF]"
            title={`Scrub Simulation Timeline (Tick #${tickNumber})`}
          />
        </div>
      </div>

      {/* Active Alerts Pill */}
      {alertCount > 0 && (
        <button
          onClick={() => onNavigate?.('alerts')}
          className="flex items-center gap-1.5 bg-[#FF4D5E]/15 border border-[#FF4D5E]/40 text-[#FF4D5E] px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold hover:bg-[#FF4D5E]/25 transition-all"
          title="View Active Hazards"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{alertCount} HAZARD{alertCount > 1 ? 'S' : ''}</span>
        </button>
      )}

      {/* Connectivity Status Indicators */}
      <div className="flex items-center gap-2 bg-[#0B1B2E] border border-[#1A3450] px-2.5 py-1.5 rounded-lg text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <Radio className={`w-3 h-3 ${isWsConnected ? 'text-[#00D69A] animate-pulse' : 'text-slate-600'}`} />
          <span className={isWsConnected ? 'text-[#00D69A]' : 'text-[#8295AC]'}>WS</span>
        </div>
        <span className="text-[#1A3450]">|</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-[#00D69A]' : 'bg-[#FF4D5E]'}`} />
          <span className={apiConnected ? 'text-[#00D69A]' : 'text-[#FF4D5E]'}>REST</span>
        </div>
      </div>

      {/* Operator Badge */}
      <div className="hidden xl:flex items-center gap-1.5 text-[#8295AC] text-xs font-mono bg-[#0B1B2E] border border-[#1A3450] px-2.5 py-1.5 rounded-lg">
        <UserCheck className="w-3.5 h-3.5 text-[#00D5FF]" />
        <span className="text-[#E8F0FA] text-[11px]">FLT DIR</span>
      </div>

      {/* Safety Boundary Notice */}
      <div className="flex items-center gap-1.5 bg-[#FFB547]/10 border border-[#FFB547]/25 text-[#FFB547] px-2.5 py-1 rounded-lg text-[10px] font-semibold shrink-0">
        <ShieldAlert className="w-3.5 h-3.5" />
        SIMULATION ONLY
      </div>
    </header>
  );
};

