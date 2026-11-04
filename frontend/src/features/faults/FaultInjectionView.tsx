import React, { useState, useEffect } from 'react';
import { Flame, ShieldAlert, CheckCircle, AlertTriangle, RefreshCw, Zap, Battery, Thermometer, Radio, Cpu } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const FaultInjectionView: React.FC = () => {
  const { selectedSatelliteId, satellites, setSelectedSatellite } = useOrbitStore();
  const [activeFaults, setActiveFaults] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [faultType, setFaultType] = useState('SOLAR_ARRAY_DROP');
  const [severity, setSeverity] = useState(1.5);
  const [mlReport, setMlReport] = useState<any>(null);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';
  const sat = satellites[satId];

  const fetchFaults = async () => {
    setLoading(true);
    try {
      const [actResp, histResp, anomResp] = await Promise.all([
        fetch('/api/v1/faults/active'),
        fetch('/api/v1/faults/history'),
        fetch(`/api/v1/ml/anomaly/${satId}`)
      ]);
      if (actResp.ok) setActiveFaults(await actResp.json());
      if (histResp.ok) setHistory(await histResp.json());
      if (anomResp.ok) setMlReport(await anomResp.json());
    } catch (err) {
      console.error('Failed to fetch faults data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaults();
    const interval = setInterval(fetchFaults, 3000);
    return () => clearInterval(interval);
  }, [satId]);

  const handleInject = async () => {
    try {
      const resp = await fetch('/api/v1/faults/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satellite_id: satId,
          fault_type: faultType,
          severity: Number(severity)
        })
      });
      if (resp.ok) {
        await fetchFaults();
      }
    } catch (err) {
      console.error('Error injecting fault:', err);
    }
  };

  const handleClear = async () => {
    try {
      const resp = await fetch(`/api/v1/faults/clear/${satId}`, { method: 'POST' });
      if (resp.ok) {
        await fetchFaults();
      }
    } catch (err) {
      console.error('Error clearing fault:', err);
    }
  };

  const faultDefinitions = [
    { type: 'SOLAR_ARRAY_DROP', name: 'Solar Array Drop (90% Flux Loss)', icon: <Zap className="w-4 h-4 text-[#FFB547]" />, desc: 'Simulates solar cell string micro-meteoroid impact or deployment stall.' },
    { type: 'THERMAL_RUNAWAY', name: 'Thermal Excursion Runaway (>65°C)', icon: <Thermometer className="w-4 h-4 text-[#FF4D5E]" />, desc: 'Simulates payload heater relay fused shut or MLI blanket detachment.' },
    { type: 'VOLTAGE_SPIKE', name: 'PDU Voltage Surge (+6.4V Spike)', icon: <Cpu className="w-4 h-4 text-[#FF4D5E]" />, desc: 'Simulates power distribution unit shunt regulator failure.' },
    { type: 'BATTERY_DEGRADATION', name: 'Battery Accelerated Capacity Loss', icon: <Battery className="w-4 h-4 text-[#FFB547]" />, desc: 'Simulates cell internal short circuit with high impedance.' },
    { type: 'COMM_FAILURE', name: 'Transponder Carrier Loss (RF Blackout)', icon: <Radio className="w-4 h-4 text-[#8295AC]" />, desc: 'Simulates S/X band power amplifier thermal shutdown.' },
  ];

  const satActiveFaults = activeFaults.filter(f => f.satellite_id === satId);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF4D5E]/10 border border-[#FF4D5E]/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#FF4D5E]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">HARDWARE SUBSYSTEM FAULT INJECTION STUDIO</h1>
            <p className="text-[11px] text-[#8295AC]">Controlled simulated spacecraft anomaly injection to verify FDIR autonomy and ML detection.</p>
          </div>
        </div>

        {/* Target Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0B1B2E] border border-[#1A3450] p-1 rounded-lg">
            {Object.values(satellites).map((s) => (
              <button
                key={s.satellite_id}
                onClick={() => setSelectedSatellite(s.satellite_id)}
                className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all ${
                  satId === s.satellite_id
                    ? 'bg-[#FF4D5E] text-[#050B16] font-bold shadow-sm shadow-rose-500/20'
                    : 'text-[#8295AC] hover:text-[#E8F0FA]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button
            onClick={fetchFaults}
            className="p-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC] hover:text-[#E8F0FA] transition-all"
            title="Refresh Fault State"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00D5FF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panel + Live Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Fault Configuration Form */}
        <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-4">
          <h2 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FF4D5E]" />
            <span>Select & Inject Subsystem Anomaly</span>
          </h2>

          <div className="space-y-2">
            <label className="text-[10px] text-[#8295AC] uppercase">Anomaly Profile</label>
            <div className="grid grid-cols-1 gap-2">
              {faultDefinitions.map((f) => (
                <div
                  key={f.type}
                  onClick={() => setFaultType(f.type)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    faultType === f.type
                      ? 'bg-[#10243B] border-[#FF4D5E] shadow-sm shadow-rose-500/10'
                      : 'bg-[#0B1B2E] border-[#1A3450] hover:border-[#8295AC]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {f.icon}
                    <div>
                      <div className="font-semibold text-[#E8F0FA] text-xs">{f.name}</div>
                      <div className="text-[10px] text-[#8295AC]">{f.desc}</div>
                    </div>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    faultType === f.type ? 'border-[#FF4D5E] bg-[#FF4D5E]' : 'border-[#1A3450]'
                  }`}>
                    {faultType === f.type && <div className="w-1.5 h-1.5 rounded-full bg-[#050B16]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#8295AC] uppercase block mb-1">
              Fault Severity Multiplier: <span className="text-[#00D5FF] font-bold">{severity}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-[#FF4D5E] bg-[#0B1B2E]"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleInject}
              className="flex-1 py-2 rounded-lg bg-[#FF4D5E] text-[#050B16] font-bold hover:bg-[#FF4D5E]/90 flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 active:scale-95 transition-all"
            >
              <Flame className="w-4 h-4" />
              <span>Apply Fault to {sat?.name || satId}</span>
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg bg-[#00D69A]/15 text-[#00D69A] border border-[#00D69A]/30 hover:bg-[#00D69A]/25 font-bold active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Clear & Restore Nominal</span>
            </button>
          </div>
        </div>

        {/* Right: Live Impact & ML Response Verification */}
        <div className="space-y-4">
          {/* Active Fault Status Card */}
          <div className={`p-5 rounded-xl border ${
            satActiveFaults.length > 0 ? 'bg-[#FF4D5E]/10 border-[#FF4D5E]/50' : 'bg-[#071426] border-[#1A3450]'
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${satActiveFaults.length > 0 ? 'text-[#FF4D5E]' : 'text-[#00D69A]'}`} />
                <span>Active Hardware Faults on {sat?.name}</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                satActiveFaults.length > 0 ? 'bg-[#FF4D5E] text-[#050B16]' : 'bg-[#00D69A]/20 text-[#00D69A]'
              }`}>
                {satActiveFaults.length} FAULT(S) ACTIVE
              </span>
            </div>

            {satActiveFaults.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#00D69A] flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>All satellite subsystems operating nominally with 0 injected failures.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {satActiveFaults.map((f, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#0B1B2E] border border-[#FF4D5E]/30 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#FF4D5E] text-xs">{f.fault_type}</div>
                      <div className="text-[10px] text-[#8295AC]">Severity Factor: {f.severity}x</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#FF4D5E]/20 text-[#FF4D5E] font-bold">
                      ACTIVE DEGRADATION
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Telemetry Verification */}
          <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-3">
            <h3 className="font-bold text-xs text-[#E8F0FA] uppercase tracking-wider">
              Live Subsystem Telemetry Response
            </h3>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                <div className="text-[9px] text-[#8295AC] uppercase">Solar Power Output</div>
                <div className="text-lg font-bold text-[#00D5FF]">{sat?.solar_power_w?.toFixed(0) ?? 240} W</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                <div className="text-[9px] text-[#8295AC] uppercase">Bus Voltage</div>
                <div className={`text-lg font-bold ${(sat?.bus_voltage_v ?? 28.0) > 32.0 ? 'text-[#FF4D5E]' : 'text-[#E8F0FA]'}`}>
                  {sat?.bus_voltage_v?.toFixed(2) ?? 28.2} V
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                <div className="text-[9px] text-[#8295AC] uppercase">Battery Temperature</div>
                <div className={`text-lg font-bold ${(sat?.battery_temp_c ?? 20.0) > 45.0 ? 'text-[#FF4D5E]' : 'text-[#00D69A]'}`}>
                  {sat?.battery_temp_c?.toFixed(1) ?? 20.0}°C
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450]">
                <div className="text-[9px] text-[#8295AC] uppercase">RF Downlink Status</div>
                <div className={`text-lg font-bold ${sat?.comm_link_active ? 'text-[#00D69A]' : 'text-[#FF4D5E]'}`}>
                  {sat?.comm_link_active ? '12.5 Mbps' : 'OFFLINE'}
                </div>
              </div>
            </div>

            {/* ML Detection Verification */}
            <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] flex items-center justify-between">
              <div>
                <div className="text-[9px] text-[#8295AC] uppercase">Isolation Forest Detection</div>
                <div className={`font-bold text-xs ${mlReport?.anomaly_detected ? 'text-[#FF4D5E]' : 'text-[#00D69A]'}`}>
                  {mlReport?.anomaly_detected ? `DETECTED: ${mlReport?.primary_driver}` : 'NO ANOMALIES FLAGGED'}
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                mlReport?.anomaly_detected ? 'bg-[#FF4D5E]/20 text-[#FF4D5E]' : 'bg-[#00D69A]/20 text-[#00D69A]'
              }`}>
                Score: {Math.round((mlReport?.anomaly_score ?? 0.05) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fault Audit History Table */}
      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <div className="px-4 py-3 bg-[#0B1B2E] border-b border-[#1A3450] font-bold text-[#E8F0FA] text-[11px] uppercase tracking-wider">
          Fault Injection & Resolution Audit Log ({history.length})
        </div>
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="bg-[#071426] border-b border-[#1A3450] text-[#8295AC] text-[9px] uppercase tracking-wider">
              <th className="px-4 py-2">Fault ID</th>
              <th className="px-4 py-2">Satellite</th>
              <th className="px-4 py-2">Fault Type</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Injected Epoch</th>
              <th className="px-4 py-2">Resolved Epoch</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3450]/40 text-[11px]">
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[#8295AC]">No recorded fault injection events.</td>
              </tr>
            ) : (
              history.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#10243B]/40 transition-colors">
                  <td className="px-4 py-2 text-[#00D5FF]">{rec.id}</td>
                  <td className="px-4 py-2 text-[#E8F0FA]">{rec.satellite_id}</td>
                  <td className="px-4 py-2 font-semibold text-[#FFB547]">{rec.fault_type}</td>
                  <td className="px-4 py-2 text-[#8295AC]">{rec.severity}x</td>
                  <td className="px-4 py-2 text-[#8295AC]">{new Date(rec.injected_epoch).toUTCString()}</td>
                  <td className="px-4 py-2 text-[#8295AC]">{rec.resolved_epoch ? new Date(rec.resolved_epoch).toUTCString() : '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                      rec.status === 'ACTIVE' ? 'bg-[#FF4D5E]/20 text-[#FF4D5E]' : 'bg-[#00D69A]/20 text-[#00D69A]'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
