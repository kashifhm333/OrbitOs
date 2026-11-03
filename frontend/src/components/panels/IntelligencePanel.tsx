import React, { useState, useEffect } from 'react';
import { Cpu, AlertTriangle, CheckCircle, TrendingUp, Flame } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

interface AnomalyReport {
  satellite_id: string;
  anomaly_detected: boolean;
  anomaly_score: number;
  severity: string;
  primary_driver: string;
  feature_deviations: Record<string, string>;
  recommended_action: string;
}

interface ForecastData {
  satellite_id: string;
  horizon_hours: number;
  final_predicted_soc_pct: number;
  final_predicted_propellant_kg: number;
  min_soc_projected: number;
  brownout_risk: boolean;
  trajectory: Array<{
    epoch: string;
    predicted_soc_pct: number;
    lower_ci_95: number;
    upper_ci_95: number;
    in_eclipse: boolean;
  }>;
}

export const IntelligencePanel: React.FC = () => {
  const { selectedSatelliteId, satellites } = useOrbitStore();
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [faultType, setFaultType] = useState<string>('SOLAR_ARRAY_DROP');

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';

  const fetchIntelligenceData = async () => {
    try {
      const [anomResp, fcResp] = await Promise.all([
        fetch(`/api/intelligence/anomaly/${satId}`),
        fetch(`/api/intelligence/forecast/${satId}?horizon_hours=12`)
      ]);
      if (anomResp.ok) {
        setReport(await anomResp.json());
      }
      if (fcResp.ok) {
        setForecast(await fcResp.json());
      }
    } catch (err) {
      console.error('Failed to fetch intelligence report:', err);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();
    const interval = setInterval(fetchIntelligenceData, 3000);
    return () => clearInterval(interval);
  }, [satId]);

  const handleInjectFault = async () => {
    setLoading(true);
    try {
      await fetch('/api/intelligence/fault-inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          satellite_id: satId,
          fault_type: faultType,
          severity: 1.5
        })
      });
      await fetchIntelligenceData();
    } catch (err) {
      console.error('Error injecting fault:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFault = async () => {
    setLoading(true);
    try {
      await fetch(`/api/intelligence/fault-clear/${satId}`, { method: 'POST' });
      await fetchIntelligenceData();
    } catch (err) {
      console.error('Error clearing fault:', err);
    } finally {
      setLoading(false);
    }
  };

  const scorePct = Math.round((report?.anomaly_score ?? 0.05) * 100);

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between bg-space-900/80 p-3 rounded-xl border border-space-700">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-white text-sm">TELEMETRY INTELLIGENCE</span>
        </div>
        <span className="text-[10px] text-slate-400">Target: {satId}</span>
      </div>

      {/* Real-Time ML Anomaly Score Card */}
      <div className={`p-4 rounded-xl border transition-all ${
        report?.anomaly_detected
          ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/20'
          : 'bg-space-900/60 border-space-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {report?.anomaly_detected ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-bold text-slate-200">ISOLATION FOREST DETECTOR</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            report?.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
            report?.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {report?.severity || 'NOMINAL'}
          </span>
        </div>

        {/* Progress Bar Gauge */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Anomaly Confidence:</span>
            <span className={`font-bold ${report?.anomaly_detected ? 'text-rose-400' : 'text-emerald-400'}`}>
              {scorePct}%
            </span>
          </div>
          <div className="w-full bg-space-950 h-2 rounded-full overflow-hidden border border-space-800">
            <div
              className={`h-full transition-all duration-500 ${
                scorePct > 80 ? 'bg-rose-500' : scorePct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${scorePct}%` }}
            />
          </div>
        </div>

        {/* Diagnostic Deviations */}
        {report?.anomaly_detected && (
          <div className="space-y-1.5 p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px]">
            <div className="text-rose-300 font-semibold">Primary Driver: {report.primary_driver}</div>
            <div className="text-slate-400 text-[10px]">
              Recommendation: <span className="text-cyan-400">{report.recommended_action}</span>
            </div>
          </div>
        )}
      </div>

      {/* Synthetic Fault Injection Sandbox */}
      <div className="p-3.5 rounded-xl bg-space-900/60 border border-space-700 space-y-2.5">
        <div className="flex items-center space-x-1.5 text-slate-300 font-semibold border-b border-space-800 pb-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>SYNTHETIC FAULT INJECTION (BENCHMARK)</span>
        </div>

        <div className="flex space-x-2">
          <select
            value={faultType}
            onChange={(e) => setFaultType(e.target.value)}
            className="flex-1 bg-space-950 border border-space-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 outline-none"
          >
            <option value="SOLAR_ARRAY_DROP">Solar Array Degradation (-40%)</option>
            <option value="THERMAL_RUNAWAY">Radiator Thermal Runaway (+15°C)</option>
            <option value="VOLTAGE_SPIKE">Power Bus Voltage Spike (+8V)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleInjectFault}
            disabled={loading}
            className="py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-bold border border-rose-500/40 transition-all active:scale-95 disabled:opacity-50"
          >
            INJECT FAULT
          </button>
          <button
            onClick={handleClearFault}
            disabled={loading}
            className="py-1.5 rounded-lg bg-space-700 hover:bg-space-600 text-slate-300 font-bold border border-space-600 transition-all active:scale-95 disabled:opacity-50"
          >
            RESET NOMINAL
          </button>
        </div>
      </div>

      {/* 24-Hour Resource Forecast Summary */}
      {forecast && (
        <div className="p-3.5 rounded-xl bg-space-900/60 border border-space-700 space-y-2.5">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-space-800 pb-1.5">
            <span className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>RESOURCE FORECASTER (12H)</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              forecast.brownout_risk ? 'bg-rose-500/20 text-rose-400 font-bold' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {forecast.brownout_risk ? 'BROWNOUT RISK' : 'MARGIN SUFFICIENT'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-space-950 p-2 rounded-lg border border-space-800">
              <span className="text-[10px] text-slate-500 block">MIN PROJECTED SOC</span>
              <span className="text-cyan-400 font-bold">{forecast.min_soc_projected}%</span>
            </div>
            <div className="bg-space-950 p-2 rounded-lg border border-space-800">
              <span className="text-[10px] text-slate-500 block">FINAL PROPELLANT</span>
              <span className="text-emerald-400 font-bold">{forecast.final_predicted_propellant_kg} kg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
