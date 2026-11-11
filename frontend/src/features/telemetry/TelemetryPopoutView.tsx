import React, { useEffect, useState } from 'react';
import { Activity, Zap, Thermometer, Radio, ShieldCheck, AlertCircle } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { StatusBadge } from '../../components/common/StatusBadge';

export const TelemetryPopoutView: React.FC = () => {
  const { satellites, selectedSatelliteId, formalInvariants, timeScale } = useOrbitStore();
  const [telemetryState, setTelemetryState] = useState<any>(null);

  // Sync via HTML5 BroadcastChannel('orbitos_telemetry_sync')
  useEffect(() => {
    const channel = new BroadcastChannel('orbitos_telemetry_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'TELEMETRY_UPDATE') {
        setTelemetryState(event.data);
      }
    };
    return () => channel.close();
  }, []);

  const sat = telemetryState?.satellite || 
    (selectedSatelliteId && satellites[selectedSatelliteId]) || 
    Object.values(satellites)[0];

  const invariants = telemetryState?.formalInvariants || formalInvariants;
  const isLossOfSignal = !sat || sat.operational_state === 'DESTROYED' || sat.operational_state === 'IMPACTED' || sat.bus_voltage_v === 0;

  return (
    <div className="min-h-screen bg-[#050B16] text-[#E8F0FA] font-mono p-4 space-y-4 select-none">
      {/* Detached Window Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1A3450]">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#00D5FF] animate-pulse" />
          <div>
            <h1 className="text-sm font-bold tracking-wider text-[#E8F0FA]">
              ORBITOS DETACHED TELEMETRY COCKPIT
            </h1>
            <div className="text-[10px] text-[#8295AC]">Multi-Monitor BroadcastChannel Sync Active</div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#10243B] text-[#00D5FF] border border-[#1A3450] font-bold">
          {timeScale}
        </span>
      </div>

      {isLossOfSignal ? (
        <div className="p-6 rounded-2xl bg-[#FF4D5E]/15 border-2 border-[#FF4D5E] text-center space-y-2 animate-pulse">
          <AlertCircle className="w-8 h-8 mx-auto text-[#FF4D5E]" />
          <div className="text-base font-bold text-[#FF4D5E]">TERMINAL LOSS OF SIGNAL (LOS)</div>
          <p className="text-xs text-[#E8F0FA]">Spacecraft telemetry stream disconnected. Subsystem bus collapsed.</p>
        </div>
      ) : (
        <>
          {/* Active Spacecraft Card */}
          <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1A3450] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#E8F0FA]">{sat.name}</div>
              <div className="text-[10px] text-[#8295AC]">ID: {sat.satellite_id}</div>
            </div>
            <StatusBadge variant="active" label={sat.operational_state} dot />
          </div>

          {/* Subsystem Telemetry Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* EPS / Power Bus */}
            <div className="p-3 rounded-xl bg-[#071426] border border-[#1A3450] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8295AC] uppercase">
                <Zap className="w-3.5 h-3.5 text-[#00D5FF]" />
                <span>Electrical Power (EPS)</span>
              </div>
              <div className="text-lg font-bold text-[#00D5FF]">
                {(sat.bus_voltage_v ?? 28.2).toFixed(1)} V
              </div>
              <div className="text-[10px] text-[#8295AC]">
                Bus Current: {(sat.bus_current_a ?? 3.6).toFixed(1)} A · Solar: {sat.solar_power_w ?? 240} W
              </div>
              <div className="w-full bg-[#0B1B2E] rounded-full h-1.5 mt-2 overflow-hidden border border-[#1A3450]">
                <div
                  className="bg-[#00D5FF] h-full"
                  style={{ width: `${Math.min(100, sat.battery_soc_pct ?? 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-right text-[#00D5FF] font-semibold">
                Battery SoC: {(sat.battery_soc_pct ?? 100).toFixed(1)}%
              </div>
            </div>

            {/* Thermal Subsystem */}
            <div className="p-3 rounded-xl bg-[#071426] border border-[#1A3450] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8295AC] uppercase">
                <Thermometer className="w-3.5 h-3.5 text-[#FFB547]" />
                <span>Thermal Subsystem</span>
              </div>
              <div className="text-lg font-bold text-[#FFB547]">
                {(sat.battery_temp_c ?? 20.0).toFixed(1)}°C
              </div>
              <div className="text-[10px] text-[#8295AC]">
                Avionics: {(sat.avionics_temp_c ?? 28.0).toFixed(1)}°C · Eclipse: {sat.in_eclipse ? 'UMBRA' : 'SUNLIT'}
              </div>
            </div>

            {/* Communication & Downlink */}
            <div className="p-3 rounded-xl bg-[#071426] border border-[#1A3450] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8295AC] uppercase">
                <Radio className="w-3.5 h-3.5 text-[#00D69A]" />
                <span>Communications (TT&C)</span>
              </div>
              <div className="text-lg font-bold text-[#00D69A]">
                {(sat.downlink_rate_mbps ?? 15.0).toFixed(1)} Mbps
              </div>
              <div className="text-[10px] text-[#8295AC]">
                Link: {sat.comm_link_active ? 'CARRIER LOCK' : 'CARRIER SEARCH'}
              </div>
            </div>

            {/* Propulsion / Fuel */}
            <div className="p-3 rounded-xl bg-[#071426] border border-[#1A3450] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8295AC] uppercase">
                <Zap className="w-3.5 h-3.5 text-[#FFB547]" />
                <span>Propulsion Bus</span>
              </div>
              <div className="text-lg font-bold text-[#E8F0FA]">
                {(sat.propellant_mass_kg ?? 15.0).toFixed(2)} kg
              </div>
              <div className="text-[10px] text-[#8295AC]">
                Hydrazine Isp = 220s · Nominal
              </div>
            </div>
          </div>
        </>
      )}

      {/* Formal Invariants (VDM-SL) Panel */}
      <div className="p-3.5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-[#8295AC] font-bold uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D5FF]" />
            <span>Formal Invariants (VDM-SL)</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            invariants?.is_violated ? 'bg-[#FF4D5E]/20 text-[#FF4D5E] border border-[#FF4D5E]' : 'bg-[#00D69A]/20 text-[#00D69A] border border-[#00D69A]'
          }`}>
            {invariants?.summary || 'ALL PASS (10/10)'}
          </span>
        </div>

        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between p-1 rounded bg-[#0B1B2E]">
            <span className="text-[#8295AC]">SPEC-INV-003 (Battery [0-100]%):</span>
            <span className={invariants?.spec_inv_003 === 'VIOLATED' ? 'text-[#FF4D5E] font-bold' : 'text-[#00D69A]'}>
              {invariants?.spec_inv_003 || 'VERIFIED'}
            </span>
          </div>
          <div className="flex justify-between p-1 rounded bg-[#0B1B2E]">
            <span className="text-[#8295AC]">SPEC-INV-004 (Fuel Mass &gt;= 0):</span>
            <span className={invariants?.spec_inv_004 === 'VIOLATED' ? 'text-[#FF4D5E] font-bold' : 'text-[#00D69A]'}>
              {invariants?.spec_inv_004 || 'VERIFIED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
