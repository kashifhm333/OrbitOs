import React, { useEffect, useState } from 'react';
import { Topbar } from './components/layout/Topbar';
import { Sidebar, NavPage } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { BottomStrip } from './components/layout/BottomStrip';
import { OrbitalCanvas } from './components/visualization/OrbitalCanvas';
import { useOrbitStore } from './store/useOrbitStore';
import { Eye, Layers } from 'lucide-react';

// Aerospace Feature Views
import { SatellitesView } from './features/satellites/SatellitesView';
import { TrackingView } from './features/tracking/TrackingView';
import { ImageryView } from './features/imagery/ImageryView';
import { TelemetryView } from './features/telemetry/TelemetryView';
import { MissionsView } from './features/missions/MissionsView';
import { ConjunctionsView } from './features/conjunctions/ConjunctionsView';
import { GroundStationsView } from './features/ground/GroundStationsView';
import { IntelligenceView } from './features/intelligence/IntelligenceView';
import { FaultInjectionView } from './features/faults/FaultInjectionView';
import { AlertsView } from './features/alerts/AlertsView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';

export const App: React.FC = () => {
  const { setSnapshot, setWsConnected } = useOrbitStore();
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [is2D, setIs2D] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws/v1/simulation`;

    let isDisposed = false;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          if (isDisposed) {
            ws?.close(1000, 'Normal Closure');
            return;
          }
          setWsConnected(true);
        };
        ws.onmessage = (e) => {
          if (isDisposed) return;
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'SIMULATION_TICK_SNAPSHOT' || data.satellites) {
              setSnapshot(data);
            }
          } catch (parseErr) {
            console.error('WS Parse Error:', parseErr);
          }
        };
        ws.onclose = () => {
          setWsConnected(false);
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connect, 2000);
          }
        };
        ws.onerror = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (err) {
        setWsConnected(false);
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    };

    connect();
    return () => {
      isDisposed = true;
      clearTimeout(reconnectTimeout);
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Normal Closure');
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            ws?.close(1000, 'Normal Closure');
          };
        }
      }
    };
  }, [setSnapshot, setWsConnected]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#050B16] text-[#E8F0FA] font-sans">
      {/* Top Mission Control Bar */}
      <Topbar onNavigate={setActivePage} />

      {/* Main Layout: Persistent Sidebar + Dynamic Workspace Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Persistent Navigation Sidebar */}
        <Sidebar activePage={activePage} onNavigate={setActivePage} />

        {/* Dynamic Workspace based on Active Navigation Page */}
        {activePage === 'dashboard' ? (
          <>
            {/* Center Mission Control Workspace */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
              <section className="flex-1 relative overflow-hidden bg-[#050B16]">
                {!is2D ? (
                  <OrbitalCanvas />
                ) : (
                  <div className="w-full h-full bg-[#050B16] flex flex-col items-center justify-center text-center font-mono">
                    <Layers className="w-12 h-12 text-[#00D5FF] mb-3 opacity-80" />
                    <h2 className="text-base font-bold text-[#E8F0FA] mb-1">2D Geocentric Ephemeris Viewport</h2>
                    <p className="text-xs text-[#8295AC] max-w-sm">
                      3D WebGL pipeline bypassed for low-power operation mode (NFR-ACC-002)
                    </p>
                  </div>
                )}

                {/* Floating 2D / 3D Mode Toggle */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <button
                    onClick={() => setIs2D(!is2D)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#071426]/90 backdrop-blur-md border border-[#1A3450] text-xs font-mono text-[#E8F0FA] hover:bg-[#10243B] transition-all shadow-lg"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#00D5FF]" />
                    <span>{is2D ? 'ENABLE 3D' : '2D VIEW'}</span>
                  </button>
                </div>
              </section>

              {/* Bottom 3-Column Data Strip */}
              <BottomStrip />
            </main>

            {/* Right Subsystem Telemetry & Mission Panel */}
            <RightPanel activePage={activePage} />
          </>
        ) : (
          <main className="flex-1 flex flex-col overflow-hidden relative bg-[#050B16]">
            {activePage === 'satellites' && <SatellitesView />}
            {activePage === 'tracking' && <TrackingView />}
            {activePage === 'imagery' && <ImageryView />}
            {activePage === 'telemetry' && <TelemetryView />}
            {activePage === 'missions' && <MissionsView />}
            {activePage === 'conjunctions' && <ConjunctionsView />}
            {activePage === 'ground' && <GroundStationsView />}
            {activePage === 'intelligence' && <IntelligenceView />}
            {activePage === 'faults' && <FaultInjectionView />}
            {activePage === 'alerts' && <AlertsView />}
            {activePage === 'reports' && <ReportsView />}
            {activePage === 'settings' && <SettingsView />}
          </main>
        )}
      </div>
    </div>
  );
};
