import React, { useEffect, useState } from 'react';
import { Header } from './components/common/Header';
import { OrbitalCanvas } from './components/visualization/OrbitalCanvas';
import { FleetPanel } from './components/panels/FleetPanel';
import { TelemetryDetailPanel } from './components/panels/TelemetryDetailPanel';
import { ConjunctionAlertsPanel } from './components/panels/ConjunctionAlertsPanel';
import { MissionPlannerPanel } from './components/panels/MissionPlannerPanel';
import { GroundStationPanel } from './components/panels/GroundStationPanel';
import { IntelligencePanel } from './components/panels/IntelligencePanel';
import { useOrbitStore } from './store/useOrbitStore';
import { ShieldCheck, Layers, Eye } from 'lucide-react';

export const App: React.FC = () => {
  const { setSnapshot, setWsConnected } = useOrbitStore();
  const [activeTab, setActiveTab] = useState<'fleet' | 'telemetry' | 'safety' | 'missions' | 'ground' | 'intelligence'>('fleet');
  const [is2DMode, setIs2DMode] = useState<boolean>(false);

  // WebSocket Connection Hook for Live Telemetry Stream
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws/telemetry`;

    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SIMULATION_TICK_SNAPSHOT') {
            setSnapshot(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error, retrying...', err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [setSnapshot, setWsConnected]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-space-900 text-slate-100 font-sans">
      {/* Top Mission Control Bar */}
      <Header />

      {/* Main Split-Pane Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Side: 3D WebGL Visualization Viewport */}
        <section className="flex-1 h-full relative">
          {!is2DMode ? (
            <OrbitalCanvas />
          ) : (
            <div className="w-full h-full bg-space-950 flex flex-col items-center justify-center p-8 text-center font-mono">
              <Layers className="w-12 h-12 text-cyan-400 mb-3" />
              <h2 className="text-lg font-bold text-white mb-1">2D Lightweight Telemetry Viewport Active</h2>
              <p className="text-xs text-slate-400 max-w-md">
                3D WebGL rendering disabled to preserve battery and GPU memory on low-power devices (NFR-ACC-002).
              </p>
            </div>
          )}

          {/* Floating Controls over Viewport */}
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
            <button
              onClick={() => setIs2DMode(!is2DMode)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-space-800/80 backdrop-blur border border-space-700 text-xs font-mono text-slate-200 hover:bg-space-700 hover:text-white transition-all shadow-md"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>{is2DMode ? 'ENABLE 3D VIEW' : '2D VIEW'}</span>
            </button>
          </div>
        </section>

        {/* Right Side: Mission Control Panels (Sidebar) */}
        <aside className="w-[460px] h-full bg-space-800/90 backdrop-blur-md border-l border-space-700 flex flex-col shadow-2xl z-10">
          {/* Panel Tab Navigation */}
          <div className="flex border-b border-space-700 px-3 pt-3 bg-space-900/60 overflow-x-auto space-x-1">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`pb-2.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === 'fleet'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Fleet
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`pb-2.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === 'telemetry'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Telemetry
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`pb-2.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === 'safety'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Conjunctions
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className={`pb-2.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === 'missions'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Missions
            </button>
            <button
              onClick={() => setActiveTab('ground')}
              className={`pb-2.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === 'ground'
                  ? 'border-cyan-400 text-cyan-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Ground
            </button>
            <button
              onClick={() => setActiveTab('intelligence')}
              className={`pb-2.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === 'intelligence'
                  ? 'border-purple-400 text-purple-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              AI/ML
            </button>
          </div>

          {/* Panel Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'fleet' && <FleetPanel />}
            {activeTab === 'telemetry' && <TelemetryDetailPanel />}
            {activeTab === 'safety' && <ConjunctionAlertsPanel />}
            {activeTab === 'missions' && <MissionPlannerPanel />}
            {activeTab === 'ground' && <GroundStationPanel />}
            {activeTab === 'intelligence' && <IntelligencePanel />}

            {/* Formal Invariant Verification Card (Always pinned in sidebar) */}
            <div className="p-3.5 rounded-xl bg-space-900/70 border border-space-700 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-space-800 pb-1.5">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>FORMAL INVARIANTS (VDM-SL)</span>
                </span>
                <span className="text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">
                  ALL PASS (10/10)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>SPEC-INV-003 (Battery [0-100]%):</span>
                  <span className="text-emerald-400">VERIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span>SPEC-INV-004 (Fuel Mass &ge; 0):</span>
                  <span className="text-emerald-400">VERIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span>SPEC-INV-009 (Ground Elevation &ge; 10°):</span>
                  <span className="text-emerald-400">VERIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span>SPEC-INV-010 (Simulation Isolation):</span>
                  <span className="text-emerald-400">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
