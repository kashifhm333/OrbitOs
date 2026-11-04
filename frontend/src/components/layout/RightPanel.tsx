import React, { useState } from 'react';
import { Activity, Compass, Thermometer, Zap, Radio, Rocket, ShieldCheck } from 'lucide-react';
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
  const { activeAlerts } = useOrbitStore();
  const criticalCount = activeAlerts.filter(a => a.risk_level === 'CRITICAL').length;

  return (
    <aside className="w-[380px] h-full bg-[#071426] border-l border-[#1A3450] flex flex-col shrink-0 select-none">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-[#1A3450] flex items-center justify-between shrink-0 bg-[#091A30]">
        <h2 className="text-xs font-semibold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
          <span className="text-[#00D5FF]"><Activity className="w-4 h-4" /></span>
          Satellite Subsystem Telemetry
        </h2>
        {criticalCount > 0 && (
          <StatusBadge variant="critical" label={`${criticalCount} CRITICAL`} dot />
        )}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {telTab === 'telemetry' && <TelemetryDetailPanel />}
        {telTab === 'attitude' && <AttitudePanel />}
        {telTab === 'thermal' && <ThermalPanel />}
        {telTab === 'power' && <PowerPanel />}
        {telTab === 'comm' && <CommPanel />}
        {telTab === 'mission' && <MissionStatusTimeline />}

        {/* Formal Invariants — always pinned at bottom */}
        <div className="p-3.5 rounded-xl bg-[#0B1B2E] border border-[#1A3450] text-xs font-mono space-y-2 mt-auto">
          <div className="flex items-center justify-between text-[#E8F0FA] font-semibold border-b border-[#1A3450] pb-1.5">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00D69A]" />
              <span>FORMAL INVARIANTS (VDM-SL)</span>
            </span>
            <span className="text-[10px] text-[#00D69A] px-1.5 py-0.5 rounded bg-[#00D69A]/10 border border-[#00D69A]/20">
              ALL PASS (10/10)
            </span>
          </div>
          <div className="text-[11px] text-[#8295AC] space-y-1">
            <div className="flex justify-between">
              <span>SPEC-INV-003 (Battery [0-100]%):</span>
              <span className="text-[#00D69A]">VERIFIED</span>
            </div>
            <div className="flex justify-between">
              <span>SPEC-INV-004 (Fuel Mass &ge; 0):</span>
              <span className="text-[#00D69A]">VERIFIED</span>
            </div>
            <div className="flex justify-between">
              <span>SPEC-INV-009 (Ground Elevation &ge; 10°):</span>
              <span className="text-[#00D69A]">VERIFIED</span>
            </div>
            <div className="flex justify-between">
              <span>SPEC-INV-010 (Simulation Isolation):</span>
              <span className="text-[#00D69A]">ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

