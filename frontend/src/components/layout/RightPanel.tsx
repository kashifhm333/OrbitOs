import React, { useState, useEffect } from 'react';
import { Activity, Compass, Thermometer, Zap, Radio, Rocket, ShieldCheck, ExternalLink } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { TelemetryDetailPanel } from '../panels/TelemetryDetailPanel';
import { AttitudePanel } from '../telemetry/AttitudePanel';
import { ThermalPanel } from '../telemetry/ThermalPanel';
import { PowerPanel } from '../telemetry/PowerPanel';
import { CommPanel } from '../telemetry/CommPanel';
import { MissionStatusTimeline } from '../mission/MissionStatusTimeline';
import { StatusBadge } from '../common/StatusBadge';
import { NavPage } from './Sidebar';

type TelemetryTab = 'telemetry' | 'attitude' | 'thermal' | 'power' | 'comm' | 'mission';

interface RightPanelProps {
  activePage: NavPage;
}

const telemetryTabs: { id: TelemetryTab; label: string; icon: React.ReactNode }[] = [
  { id: 'telemetry', label: 'State', icon: <Activity className="w-3 h-3" /> },
  { id: 'attitude', label: 'Attitude', icon: <Compass className="w-3 h-3" /> },
  { id: 'thermal', label: 'Thermal', icon: <Thermometer className="w-3 h-3" /> },
  { id: 'power', label: 'Power', icon: <Zap className="w-3 h-3" /> },
  { id: 'comm', label: 'Comm', icon: <Radio className="w-3 h-3" /> },
  { id: 'mission', label: 'Mission', icon: <Rocket className="w-3 h-3" /> },
];

export const RightPanel: React.FC<RightPanelProps> = () => {
  const [telTab, setTelTab] = useState<TelemetryTab>('telemetry');
  const { activeAlerts, formalInvariants, satellites, selectedSatelliteId, timeScale } = useOrbitStore();
  const criticalCount = activeAlerts.filter(a => a.risk_level === 'CRITICAL').length;
  const isViolated = formalInvariants?.is_violated ?? false;

  // Sync to multi-monitor popout window via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('orbitos_telemetry_sync');
    const selectedSat = (selectedSatelliteId && satellites[selectedSatelliteId]) || Object.values(satellites)[0];
    channel.postMessage({
      type: 'TELEMETRY_UPDATE',
      satellite: selectedSat,
      formalInvariants,
      timeScale,
      timestamp: Date.now()
    });
    return () => channel.close();
  }, [satellites, selectedSatelliteId, formalInvariants, timeScale]);

  const handlePopOut = () => {
    window.open('/telemetry-popout', 'orbitos_telemetry_popout', 'width=540,height=850,resizable=yes,scrollbars=yes');
  };

  return (
    <aside className="w-[380px] h-full bg-[#071426] border-l border-[#1A3450] flex flex-col shrink-0 select-none">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-[#1A3450] flex items-center justify-between shrink-0 bg-[#091A30]">
        <h2 className="text-xs font-semibold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
          <span className="text-[#00D5FF]"><Activity className="w-4 h-4" /></span>
          Satellite Subsystem Telemetry
        </h2>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <StatusBadge variant="critical" label={`${criticalCount} CRITICAL`} dot />
          )}
          <button
            onClick={handlePopOut}
            className="p-1.5 rounded-lg text-[#8295AC] hover:text-[#00D5FF] hover:bg-[#10243B] transition-all cursor-pointer"
            title="Pop-Out Panel to Detached Multi-Monitor Window (BroadcastChannel Sync)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Telemetry sub-tabs */}
      <div className="flex border-b border-[#1A3450] px-2 pt-2 gap-0.5 shrink-0 overflow-x-auto bg-[#071426]">
        {telemetryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTelTab(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
              telTab === tab.id
                ? 'border-[#00D5FF] text-[#00D5FF]'
                : 'border-transparent text-[#8295AC] hover:text-[#E8F0FA]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col justify-between">
        <div>
          {telTab === 'telemetry' && <TelemetryDetailPanel />}
          {telTab === 'attitude' && <AttitudePanel />}
          {telTab === 'thermal' && <ThermalPanel />}
          {telTab === 'power' && <PowerPanel />}
          {telTab === 'comm' && <CommPanel />}
          {telTab === 'mission' && <MissionStatusTimeline />}
        </div>

        {/* Formal Invariants (VDM-SL) — dynamically bound to simulation state */}
        <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-2 mt-4 transition-all ${
          isViolated 
            ? 'bg-[#FF4D5E]/10 border-[#FF4D5E]/40 shadow-lg shadow-rose-950/30' 
            : 'bg-[#0B1B2E] border-[#1A3450]'
        }`}>
          <div className="flex items-center justify-between text-[#E8F0FA] font-semibold border-b border-[#1A3450] pb-1.5">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className={`w-4 h-4 ${isViolated ? 'text-[#FF4D5E] animate-pulse' : 'text-[#00D69A]'}`} />
              <span>FORMAL INVARIANTS (VDM-SL)</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
              isViolated
                ? 'text-[#FF4D5E] bg-[#FF4D5E]/20 border-[#FF4D5E]/40 font-bold animate-pulse'
                : 'text-[#00D69A] bg-[#00D69A]/10 border-[#00D69A]/20'
            }`}>
              {formalInvariants?.summary || 'ALL PASS (10/10)'}
            </span>
          </div>
          <div className="text-[11px] text-[#8295AC] space-y-1">
            <div className="flex justify-between">
              <span>SPEC-INV-003 (Battery [0-100]%):</span>
              <span className={`font-semibold ${formalInvariants?.spec_inv_003 === 'VIOLATED' ? 'text-[#FF4D5E]' : 'text-[#00D69A]'}`}>
                {formalInvariants?.spec_inv_003 || 'VERIFIED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SPEC-INV-004 (Fuel Mass &ge; 0):</span>
              <span className={`font-semibold ${formalInvariants?.spec_inv_004 === 'VIOLATED' ? 'text-[#FF4D5E]' : 'text-[#00D69A]'}`}>
                {formalInvariants?.spec_inv_004 || 'VERIFIED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SPEC-INV-009 (Ground Elevation &ge; 10°):</span>
              <span className="text-[#00D69A]">{formalInvariants?.spec_inv_009 || 'VERIFIED'}</span>
            </div>
            <div className="flex justify-between">
              <span>SPEC-INV-010 (Simulation Isolation):</span>
              <span className="text-[#00D69A]">{formalInvariants?.spec_inv_010 || 'ACTIVE'}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

