import React from 'react';
import { Activity, Sun, Moon, Cpu, Gauge, Compass } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const TelemetryDetailPanel: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();

  const selectedSat = selectedSatelliteId ? satellites[selectedSatelliteId] : null;

  if (!selectedSat) {
    return (
      <div className="p-4 rounded-xl bg-space-800/40 border border-space-700 text-center text-xs text-slate-400 font-mono">
        Select a satellite to inspect live telemetry stream
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-space-700">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Telemetry Stream: {selectedSat.name}</span>
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-700 text-slate-300">
          {selectedSat.satellite_id}
        </span>
      </div>

      {/* Grid of Gauges */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {/* Illumination & Solar Status */}
        <div className="p-2.5 rounded-lg bg-space-800/60 border border-space-700 flex items-center justify-between">
          <span className="text-slate-400">SOLAR FLUX:</span>
          <span className={`flex items-center space-x-1 font-semibold ${selectedSat.in_eclipse ? 'text-amber-400' : 'text-cyan-400'}`}>
            {selectedSat.in_eclipse ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{selectedSat.in_eclipse ? 'ECLIPSE' : '1361 W/m²'}</span>
          </span>
        </div>

        {/* Bus Voltage */}
        <div className="p-2.5 rounded-lg bg-space-800/60 border border-space-700 flex items-center justify-between">
          <span className="text-slate-400">BUS VOLTAGE:</span>
          <span className={`font-semibold ${
            selectedSat.operational_state === 'DESTROYED' || selectedSat.operational_state === 'IMPACTED' || (selectedSat.bus_voltage_v !== undefined && selectedSat.bus_voltage_v <= 0)
              ? 'text-[#FF4D5E] font-bold animate-pulse'
              : 'text-slate-100'
          }`}>
            {selectedSat.bus_voltage_v !== undefined ? `${selectedSat.bus_voltage_v.toFixed(1)} V` : '28.4 V'}
          </span>
        </div>

        {/* Subsystem Health */}
        <div className="p-2.5 rounded-lg bg-space-800/60 border border-space-700 flex items-center justify-between">
          <span className="text-slate-400">SUBSYSTEM:</span>
          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>{selectedSat.subsystem_status}</span>
          </span>
        </div>

        {/* AI Anomaly Score */}
        <div className="p-2.5 rounded-lg bg-space-800/60 border border-space-700 flex items-center justify-between">
          <span className="text-slate-400">ANOMALY SCORE:</span>
          <span className={`font-semibold flex items-center space-x-1 ${
            selectedSat.anomaly_score > 0.5 ? 'text-amber-400' : 'text-cyan-400'
          }`}>
            <Gauge className="w-3.5 h-3.5" />
            <span>{selectedSat.anomaly_score.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* ECI Coordinate Vector Readout */}
      <div className="p-3 rounded-lg bg-space-900 border border-space-700 font-mono text-[11px] space-y-1">
        <div className="text-slate-400 flex items-center justify-between pb-1 border-b border-space-800">
          <span className="flex items-center space-x-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>ECI J2000 STATE VECTOR</span>
          </span>
          <span className="text-cyan-400">SI UNITS</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>POS X, Y, Z (km):</span>
          <span className="text-slate-100 font-semibold">
            {(selectedSat.position_eci_m[0] / 1000).toFixed(1)}, {(selectedSat.position_eci_m[1] / 1000).toFixed(1)}, {(selectedSat.position_eci_m[2] / 1000).toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>VEL X, Y, Z (km/s):</span>
          <span className="text-slate-100 font-semibold">
            {(selectedSat.velocity_eci_mps[0] / 1000).toFixed(2)}, {(selectedSat.velocity_eci_mps[1] / 1000).toFixed(2)}, {(selectedSat.velocity_eci_mps[2] / 1000).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

