import React, { useState, useEffect } from 'react';
import { Activity, Zap, Thermometer, Battery } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

interface TelemetryPoint {
  epoch: string;
  battery_soc_pct: number;
  bus_voltage_v: number;
  bus_current_a: number;
  battery_temp_c: number;
  avionics_temp_c: number;
  solar_power_w: number;
  in_eclipse: boolean;
  altitude_km: number;
}

export const TelemetryView: React.FC = () => {
  const { selectedSatelliteId, satellites, setSelectedSatellite } = useOrbitStore();
  const [history, setHistory] = useState<TelemetryPoint[]>([]);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';
  const sat = satellites[satId];

  const fetchHistory = async () => {
    try {
      const resp = await fetch(`/api/v1/telemetry/${satId}/history?limit=30`);
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, [satId]);

  const soc = sat?.battery_soc_pct ?? 95.0;
  const voltage = sat?.bus_voltage_v ?? 28.2;
  const current = sat?.bus_current_a ?? 3.8;
  const battTemp = sat?.battery_temp_c ?? 20.0;
  const avTemp = sat?.avionics_temp_c ?? 30.0;
  const solarPower = sat?.solar_power_w ?? 240.0;
  const inEclipse = sat?.in_eclipse ?? false;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00D5FF]/10 border border-[#00D5FF]/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#00D5FF]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">SUBSYSTEM TELEMETRY & HISTORICAL ANALYSIS</h1>
            <p className="text-[11px] text-[#8295AC]">High-density electrical power, thermal, RF communication, and orbital telemetry.</p>
          </div>
        </div>

        {/* Satellite Tabs */}
        <div className="flex items-center gap-1 bg-[#0B1B2E] border border-[#1A3450] p-1 rounded-lg">
          {Object.values(satellites).map((s) => (
            <button
              key={s.satellite_id}
              onClick={() => setSelectedSatellite(s.satellite_id)}
              className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all ${
                satId === s.satellite_id
                  ? 'bg-[#00D5FF] text-[#050B16] shadow-sm shadow-cyan-500/20'
                  : 'text-[#8295AC] hover:text-[#E8F0FA]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Subsystem Gauge Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Battery State of Charge */}
        <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
          <div className="flex items-center justify-between text-[#8295AC]">
            <span className="text-[10px] uppercase tracking-wider">Battery SoC</span>
            <Battery className="w-4 h-4 text-[#00D5FF]" />
          </div>
          <div className="text-2xl font-bold text-[#00D5FF]">{soc.toFixed(1)}%</div>
          <div className="w-full bg-[#0B1B2E] rounded-full h-1.5 overflow-hidden border border-[#1A3450]">
            <div 
              className={`h-full ${soc > 50 ? 'bg-[#00D5FF]' : soc > 20 ? 'bg-[#FFB547]' : 'bg-[#FF4D5E]'}`}
              style={{ width: `${soc}%` }}
            />
          </div>
          <div className="text-[10px] text-[#8295AC] flex justify-between pt-1">
            <span>Min Limit: 20%</span>
            <span className={inEclipse ? "text-[#FFB547]" : "text-[#00D69A]"}>
              {inEclipse ? "Discharging" : "Charging"}
            </span>
          </div>
        </div>

        {/* Bus Voltage & Current */}
        <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
          <div className="flex items-center justify-between text-[#8295AC]">
            <span className="text-[10px] uppercase tracking-wider">Bus Power</span>
            <Zap className="w-4 h-4 text-[#FFB547]" />
          </div>
          <div className="text-2xl font-bold text-[#E8F0FA]">{voltage.toFixed(2)} <span className="text-xs text-[#8295AC]">V</span></div>
          <div className="text-[11px] text-[#8295AC]">
            Current Draw: <span className="text-[#E8F0FA] font-semibold">{current.toFixed(2)} A</span>
          </div>
          <div className="text-[10px] text-[#8295AC] flex justify-between pt-1 border-t border-[#1A3450]">
            <span>Net Load: {(voltage * current).toFixed(1)} W</span>
            <span className="text-[#00D69A]">PDU OK</span>
          </div>
        </div>

        {/* Thermal Temperatures */}
        <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
          <div className="flex items-center justify-between text-[#8295AC]">
            <span className="text-[10px] uppercase tracking-wider">Thermal Core</span>
            <Thermometer className="w-4 h-4 text-[#00D69A]" />
          </div>
          <div className="text-2xl font-bold text-[#E8F0FA]">{battTemp.toFixed(1)}° <span className="text-xs text-[#8295AC]">C</span></div>
          <div className="text-[11px] text-[#8295AC]">
            Avionics: <span className="text-[#00D69A] font-semibold">{avTemp.toFixed(1)}°C</span>
          </div>
          <div className="text-[10px] text-[#8295AC] flex justify-between pt-1 border-t border-[#1A3450]">
            <span>Safe Margin: &lt;50°C</span>
            <span className="text-[#00D69A]">NOMINAL</span>
          </div>
        </div>

        {/* Solar Generation */}
        <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
          <div className="flex items-center justify-between text-[#8295AC]">
            <span className="text-[10px] uppercase tracking-wider">Solar Array</span>
            <Zap className="w-4 h-4 text-[#00D5FF]" />
          </div>
          <div className="text-2xl font-bold text-[#00D5FF]">{solarPower.toFixed(0)} <span className="text-xs text-[#8295AC]">W</span></div>
          <div className="text-[11px] text-[#8295AC]">
            Illumination: <span className={inEclipse ? "text-[#FFB547]" : "text-[#00D69A]"}>{inEclipse ? "Umbra Eclipse" : "100% Sunlight"}</span>
          </div>
          <div className="text-[10px] text-[#8295AC] flex justify-between pt-1 border-t border-[#1A3450]">
            <span>Wings: 2 Panels</span>
            <span className={solarPower > 0 ? "text-[#00D69A]" : "text-[#8295AC]"}>
              {solarPower > 0 ? "ACTIVE" : "SHADOWED"}
            </span>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Chart Strip */}
      <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00D5FF]" />
            <span>Time-Series Subsystem Telemetry Waveform</span>
          </h3>
          <span className="text-[10px] text-[#8295AC]">Sliding Window: Last {history.length} ticks</span>
        </div>

        {/* Visual Mini Waveform SVG */}
        <div className="h-44 bg-[#050B16] rounded-xl border border-[#1A3450] p-4 flex flex-col justify-between relative overflow-hidden">
          {history.length > 1 ? (
            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${history.length * 15} 100`} preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="25" x2={history.length * 15} y2="25" stroke="#1A3450" strokeDasharray="3,3" />
              <line x1="0" y1="50" x2={history.length * 15} y2="50" stroke="#1A3450" strokeDasharray="3,3" />
              <line x1="0" y1="75" x2={history.length * 15} y2="75" stroke="#1A3450" strokeDasharray="3,3" />

              {/* Battery SoC Curve (Cyan) */}
              <polyline
                fill="none"
                stroke="#00D5FF"
                strokeWidth="2"
                points={history.map((pt, i) => `${i * 15},${100 - pt.battery_soc_pct}`).join(' ')}
              />

              {/* Solar Generation Curve (Yellow/Orange) */}
              <polyline
                fill="none"
                stroke="#FFB547"
                strokeWidth="1.5"
                strokeDasharray="4,2"
                points={history.map((pt, i) => `${i * 15},${100 - (pt.solar_power_w / 240.0) * 80}`).join(' ')}
              />

              {/* Temperature Curve (Emerald) */}
              <polyline
                fill="none"
                stroke="#00D69A"
                strokeWidth="1.5"
                points={history.map((pt, i) => `${i * 15},${100 - (pt.battery_temp_c / 60.0) * 100}`).join(' ')}
              />
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-[#8295AC] text-xs">
              Accumulating live simulation telemetry points...
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 text-[10px] pt-2 border-t border-[#1A3450] text-[#8295AC]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-[#00D5FF] rounded" />
              <span>Battery SoC (0 - 100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-[#FFB547] rounded" />
              <span>Solar Power Generation (W)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-[#00D69A] rounded" />
              <span>Subsystem Temperature (°C)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Point Stream Log Table */}
      <div className="rounded-xl overflow-hidden border border-[#1A3450] bg-[#071426]">
        <div className="px-4 py-3 bg-[#0B1B2E] border-b border-[#1A3450] font-bold text-[#E8F0FA] text-[11px] uppercase tracking-wider">
          Telemetry Packet Log (Latest Frames)
        </div>
        <table className="w-full text-left font-mono">
          <thead>
            <tr className="bg-[#071426] border-b border-[#1A3450] text-[#8295AC] text-[9px] uppercase tracking-wider">
              <th className="px-4 py-2">Epoch (UTC)</th>
              <th className="px-4 py-2">Battery SoC</th>
              <th className="px-4 py-2">Bus Voltage</th>
              <th className="px-4 py-2">Bus Current</th>
              <th className="px-4 py-2">Batt Temp</th>
              <th className="px-4 py-2">Solar Flux</th>
              <th className="px-4 py-2">Altitude</th>
              <th className="px-4 py-2">Shadow</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3450]/40 text-[11px]">
            {history.slice(-8).reverse().map((pt, i) => (
              <tr key={i} className="hover:bg-[#10243B]/40 transition-colors">
                <td className="px-4 py-2 text-[#8295AC]">{new Date(pt.epoch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}</td>
                <td className="px-4 py-2 text-[#00D5FF] font-semibold">{pt.battery_soc_pct}%</td>
                <td className="px-4 py-2 text-[#E8F0FA]">{pt.bus_voltage_v} V</td>
                <td className="px-4 py-2 text-[#E8F0FA]">{pt.bus_current_a} A</td>
                <td className="px-4 py-2 text-[#00D69A]">{pt.battery_temp_c}°C</td>
                <td className="px-4 py-2 text-[#FFB547]">{pt.solar_power_w} W</td>
                <td className="px-4 py-2 text-[#E8F0FA]">{pt.altitude_km} km</td>
                <td className="px-4 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${pt.in_eclipse ? 'bg-[#FFB547]/20 text-[#FFB547]' : 'bg-[#00D69A]/20 text-[#00D69A]'}`}>
                    {pt.in_eclipse ? 'UMBRA' : 'SUNLIT'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
