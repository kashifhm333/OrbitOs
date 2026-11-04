import React from 'react';
import { Thermometer, ShieldCheck, Flame, Sun } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';
import { SectionHeader } from '../common/SectionHeader';
import { MetricCard } from '../common/MetricCard';

export const ThermalPanel: React.FC = () => {
  const { satellites, selectedSatelliteId } = useOrbitStore();
  const sat = selectedSatelliteId ? satellites[selectedSatelliteId] : null;
  if (!sat) return <div className="text-xs text-slate-500 font-mono text-center py-8">Select a satellite</div>;

  const battTemp = sat.battery_temp_c ?? 20.0;
  const avTemp = sat.avionics_temp_c ?? 30.0;
  const isOverheat = battTemp > 50.0 || avTemp > 60.0;

  return (
    <div className="space-y-3 font-mono text-xs select-none">
      <SectionHeader icon={<Thermometer className="w-3.5 h-3.5 text-[#00D5FF]" />} title="Thermal Control Subsystem" />

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Battery Temp"
          value={`${battTemp.toFixed(1)}°C`}
          subLabel={isOverheat ? "CRITICAL LIMIT" : "NOMINAL RANGE"}
          valueColor={battTemp > 45.0 ? "text-[#FF4D5E]" : battTemp < 10.0 ? "text-[#00D5FF]" : "text-[#00D69A]"}
          icon={<Thermometer className="w-3 h-3" />}
        />
        <MetricCard
          label="Avionics Temp"
          value={`${avTemp.toFixed(1)}°C`}
          subLabel="Core Bus"
          valueColor={avTemp > 50.0 ? "text-[#FF4D5E]" : "text-[#00D69A]"}
          icon={<Thermometer className="w-3 h-3" />}
        />
      </div>

      <div className="p-2.5 rounded-xl bg-[#0B1B2E] border border-[#1A3450] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#8295AC] uppercase tracking-wider text-[9px]">Environment Status</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
            sat.in_eclipse ? "bg-[#FFB547]/20 text-[#FFB547]" : "bg-[#00D69A]/20 text-[#00D69A]"
          }`}>
            <Sun className="w-2.5 h-2.5" />
            {sat.in_eclipse ? "UMBRA ECLIPSE" : "DIRECT SUNLIGHT"}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#8295AC] uppercase tracking-wider text-[9px]">Radiator Loop</span>
          <span className="text-[#E8F0FA] font-semibold">PASSIVE MLI INSULATION</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#8295AC] uppercase tracking-wider text-[9px]">Max Thermal Limit</span>
          <span className="text-[#FFB547] font-semibold">60.0°C</span>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-[#0B1B2E] border border-[#1A3450] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOverheat ? (
            <Flame className="w-4 h-4 text-[#FF4D5E] animate-pulse" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-[#00D69A]" />
          )}
          <div>
            <div className="text-[11px] font-semibold text-[#E8F0FA]">
              {isOverheat ? "THERMAL EXCURSION" : "THERMAL INVARIANTS PASS"}
            </div>
            <div className="text-[9px] text-[#8295AC]">
              {isOverheat ? "Temperature exceeds operational margin" : "Within safe margin [-10°C, +50°C]"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

