import React from 'react';
import { Play, Pause, StepForward, RotateCcw, Activity, ShieldAlert, Radio } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const Header: React.FC = () => {
  const { 
    simulationEpoch, 
    clockState, 
    timeAcceleration, 
    tickNumber, 
    isWsConnected 
  } = useOrbitStore();

  const handleControlAction = async (action: string, rate?: number) => {
    try {
      await fetch('/api/v1/simulations/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rate: rate || timeAcceleration }),
      });
    } catch (err) {
      console.error('Failed to send control command:', err);
    }
  };

  const formattedDate = new Date(simulationEpoch).toUTCString();

  return (
    <header className="h-16 bg-space-800 border-b border-space-700 px-6 flex items-center justify-between z-20">
      {/* Brand & Mission Identification */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-wider text-white">ORBIT<span className="text-cyan-400">OS</span></span>
            <span className="text-xs px-2 py-0.5 rounded bg-space-700 text-cyan-300 font-mono">v1.0.0-MVP</span>
          </div>
          <p className="text-xs text-slate-400">Autonomous Space Mission Management Simulator</p>
        </div>
      </div>

      {/* Center: Clock Controls & Time Management */}
      <div className="flex items-center space-x-4 bg-space-900/80 px-4 py-2 rounded-xl border border-space-700">
        <div className="flex items-center space-x-1 border-r border-space-700 pr-3">
          {clockState === 'RUNNING' ? (
            <button
              onClick={() => handleControlAction('PAUSE')}
              className="p-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
              title="Pause Simulation"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleControlAction('PLAY')}
              className="p-2 rounded-lg bg-cyan-500 text-space-900 font-bold hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20"
              title="Play Simulation"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={() => handleControlAction('STEP')}
            className="p-2 rounded-lg text-slate-300 hover:bg-space-700 hover:text-white transition-all"
            title="Step 1 Tick"
          >
            <StepForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleControlAction('RESET')}
            className="p-2 rounded-lg text-slate-300 hover:bg-space-700 hover:text-white transition-all"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed multiplier selector */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">RATE:</span>
          {[1, 5, 10, 50].map((rate) => (
            <button
              key={rate}
              onClick={() => handleControlAction('SET_SPEED', rate)}
              className={`px-2 py-1 rounded text-xs transition-all ${
                timeAcceleration === rate
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:bg-space-700'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Epoch & Tick Readout */}
        <div className="border-l border-space-700 pl-4 font-mono text-xs flex flex-col items-end">
          <div className="text-cyan-300 font-semibold">{formattedDate}</div>
          <div className="text-slate-400">TICK #{tickNumber.toString().padStart(6, '0')}</div>
        </div>
      </div>

      {/* Right Side: Connection Status & Safety Badge */}
      <div className="flex items-center space-x-4">
        {/* Stream Health Indicator */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <Radio className={`w-4 h-4 ${isWsConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span className={isWsConnected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
            {isWsConnected ? 'LIVE STREAM' : 'OFFLINE'}
          </span>
        </div>

        {/* Mandatory Safety Notice */}
        <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-medium">
          <ShieldAlert className="w-4 h-4" />
          <span>SIMULATION ONLY</span>
        </div>
      </div>
    </header>
  );
};

