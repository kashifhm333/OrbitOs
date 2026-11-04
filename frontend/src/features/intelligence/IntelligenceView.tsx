import React, { useState, useEffect } from 'react';
import { Brain, Cpu, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useOrbitStore } from '../../store/useOrbitStore';

export const IntelligenceView: React.FC = () => {
  const { selectedSatelliteId, satellites, setSelectedSatellite } = useOrbitStore();
  const [report, setReport] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [modelsMeta, setModelsMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const satId = selectedSatelliteId || Object.keys(satellites)[0] || 'sat-001';

  const fetchMLData = async () => {
    setLoading(true);
    try {
      const [anomResp, fcResp, modResp] = await Promise.all([
        fetch(`/api/v1/ml/anomaly/${satId}`),
        fetch(`/api/v1/ml/forecast/${satId}?horizon_hours=24`),
        fetch('/api/v1/ml/models')
      ]);
      if (anomResp.ok) setReport(await anomResp.json());
      if (fcResp.ok) setForecast(await fcResp.json());
      if (modResp.ok) setModelsMeta(await modResp.json());
    } catch (err) {
      console.error('Failed to fetch ML data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMLData();
    const interval = setInterval(fetchMLData, 5000);
    return () => clearInterval(interval);
  }, [satId]);

  const anomalyDetected = report?.anomaly_detected ?? false;
  const scorePct = Math.round((report?.anomaly_score ?? 0.04) * 100);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none bg-[#050B16]">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#071426] border border-[#1A3450]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[#a855f7]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#E8F0FA]">AI / ML TELEMETRY INTELLIGENCE & FORECASTING</h1>
            <p className="text-[11px] text-[#8295AC]">Unsupervised Isolation Forest anomaly detection, feature explainability, and Ridge resource forecast.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Satellite Selector */}
          <div className="flex items-center gap-1 bg-[#0B1B2E] border border-[#1A3450] p-1 rounded-lg">
            {Object.values(satellites).map((s) => (
              <button
                key={s.satellite_id}
                onClick={() => setSelectedSatellite(s.satellite_id)}
                className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all ${
                  satId === s.satellite_id
                    ? 'bg-[#a855f7] text-[#050B16] font-bold shadow-sm shadow-purple-500/20'
                    : 'text-[#8295AC] hover:text-[#E8F0FA]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <button
            onClick={fetchMLData}
            className="p-2 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#8295AC] hover:text-[#E8F0FA]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Cards: Anomaly Status & Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Anomaly Detection Status */}
        <div className={`p-4 rounded-xl border ${
          anomalyDetected ? 'bg-[#FF4D5E]/10 border-[#FF4D5E]/40' : 'bg-[#00D69A]/10 border-[#00D69A]/40'
        } space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8295AC] uppercase font-semibold">Isolation Forest Status</span>
            {anomalyDetected ? (
              <AlertTriangle className="w-4 h-4 text-[#FF4D5E]" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[#00D69A]" />
            )}
          </div>
          <div className="text-xl font-bold text-[#E8F0FA]">
            {anomalyDetected ? "ANOMALOUS TELEMETRY FLAGGED" : "NOMINAL TELEMETRY SIGNATURE"}
          </div>
          <div className="text-[11px] text-[#8295AC]">
            Severity: <span className={anomalyDetected ? "text-[#FF4D5E] font-bold" : "text-[#00D69A] font-bold"}>
              {report?.severity || "NOMINAL"}
            </span>
          </div>
        </div>

        {/* Anomaly Outlier Score */}
        <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
          <div className="flex items-center justify-between text-[#8295AC]">
            <span className="text-[10px] uppercase font-semibold">Outlier Deviation Score</span>
            <Cpu className="w-4 h-4 text-[#00D5FF]" />
          </div>
          <div className="text-2xl font-bold text-[#00D5FF]">{scorePct}%</div>
          <div className="w-full bg-[#0B1B2E] rounded-full h-1.5 overflow-hidden border border-[#1A3450]">
            <div 
              className={`h-full ${scorePct > 50 ? 'bg-[#FF4D5E]' : scorePct > 20 ? 'bg-[#FFB547]' : 'bg-[#00D69A]'}`}
              style={{ width: `${Math.min(100, scorePct * 2)}%` }}
            />
          </div>
          <div className="text-[10px] text-[#8295AC] flex justify-between pt-1">
            <span>Threshold: 20%</span>
            <span>Contamination: 0.05</span>
          </div>
        </div>

        {/* 24h Resource Projection */}
        <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
          <div className="flex items-center justify-between text-[#8295AC]">
            <span className="text-[10px] uppercase font-semibold">24h Projected Minimum SoC</span>
            <TrendingUp className="w-4 h-4 text-[#00D69A]" />
          </div>
          <div className="text-2xl font-bold text-[#00D69A]">
            {forecast?.min_soc_projected ? `${forecast.min_soc_projected.toFixed(1)}%` : '—'}
          </div>
          <div className="text-[11px] text-[#8295AC] flex justify-between">
            <span>Brownout Risk:</span>
            <span className={forecast?.brownout_risk ? "text-[#FF4D5E] font-bold" : "text-[#00D69A] font-semibold"}>
              {forecast?.brownout_risk ? "HIGH RISK" : "NEGATIVE (SAFE)"}
            </span>
          </div>
          <div className="text-[10px] text-[#8295AC] pt-1 border-t border-[#1A3450]">
            Horizon: 24.0 Hours (Linear Ridge Physics Model)
          </div>
        </div>
      </div>

      {/* Feature Explainability Breakdown */}
      <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-3">
        <h3 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#a855f7]" />
          <span>Explainable Multivariate Feature Deviations</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {report?.feature_deviations ? (
            Object.entries(report.feature_deviations).map(([feat, dev]: [string, any]) => (
              <div key={feat} className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] space-y-1">
                <div className="text-[9px] text-[#8295AC] truncate uppercase">{feat.replace(/_/g, ' ')}</div>
                <div className={`text-xs font-bold ${dev === 'NOMINAL' ? 'text-[#00D69A]' : 'text-[#FF4D5E]'}`}>
                  {dev}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-6 text-center py-4 text-[#8295AC]">All telemetry features tracking within nominal covariance bounds.</div>
          )}
        </div>

        {report?.recommended_action && (
          <div className="p-3 rounded-lg bg-[#0B1B2E] border border-[#1A3450] text-[#E8F0FA] text-[11px] flex items-center justify-between">
            <div>
              <span className="text-[#a855f7] font-bold">Recommended Autonomy Action:</span>{' '}
              {report.recommended_action}
            </div>
          </div>
        )}
      </div>

      {/* 24-Hour Forecast Waveform */}
      {forecast?.trajectory && forecast.trajectory.length > 0 && (
        <div className="p-5 rounded-xl bg-[#071426] border border-[#1A3450] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00D69A]" />
              <span>24-Hour Battery State of Charge Forecast (with 95% Confidence Envelope)</span>
            </h3>
            <span className="text-[10px] text-[#8295AC]">Step: 60 min intervals</span>
          </div>

          <div className="h-40 bg-[#050B16] rounded-xl border border-[#1A3450] p-4 flex flex-col justify-between overflow-hidden relative">
            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${forecast.trajectory.length * 20} 100`} preserveAspectRatio="none">
              {/* Baseline 20% Critical SoC Reference Line */}
              <line x1="0" y1="80" x2={forecast.trajectory.length * 20} y2="80" stroke="#FF4D5E" strokeDasharray="3,3" strokeWidth="1" />

              {/* Forecast Trajectory Line */}
              <polyline
                fill="none"
                stroke="#00D69A"
                strokeWidth="2.5"
                points={forecast.trajectory.map((pt: any, i: number) => `${i * 20},${100 - pt.predicted_soc_pct}`).join(' ')}
              />

              {/* Upper CI Line */}
              <polyline
                fill="none"
                stroke="#00D69A"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.5"
                points={forecast.trajectory.map((pt: any, i: number) => `${i * 20},${100 - pt.upper_ci_95}`).join(' ')}
              />

              {/* Lower CI Line */}
              <polyline
                fill="none"
                stroke="#00D69A"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.5"
                points={forecast.trajectory.map((pt: any, i: number) => `${i * 20},${100 - pt.lower_ci_95}`).join(' ')}
              />
            </svg>

            <div className="flex items-center justify-between text-[10px] pt-2 border-t border-[#1A3450] text-[#8295AC]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#00D69A] rounded" /> Predicted SoC</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-1 bg-[#FF4D5E] rounded" /> 20% Critical Safe Hold Line</span>
              </div>
              <span>Final End-of-Horizon SoC: {forecast.final_predicted_soc_pct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Model Architecture Metadata */}
      {modelsMeta && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
            <div className="font-bold text-[#E8F0FA] text-xs">Unsupervised Anomaly Model</div>
            <div className="text-[11px] text-[#8295AC] space-y-1">
              <div>Type: <span className="text-[#E8F0FA]">{modelsMeta.anomaly_detector?.model_type}</span></div>
              <div>Estimators: <span className="text-[#00D5FF]">{modelsMeta.anomaly_detector?.n_estimators} Trees</span></div>
              <div>Explainability: <span className="text-[#00D69A]">{modelsMeta.anomaly_detector?.explainability}</span></div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#071426] border border-[#1A3450] space-y-2">
            <div className="font-bold text-[#E8F0FA] text-xs">Predictive Resource Regressor</div>
            <div className="text-[11px] text-[#8295AC] space-y-1">
              <div>Type: <span className="text-[#E8F0FA]">{modelsMeta.resource_forecaster?.model_type}</span></div>
              <div>R² Goodness of Fit: <span className="text-[#00D69A]">{modelsMeta.resource_forecaster?.r2_score}</span></div>
              <div>Mean Absolute Error: <span className="text-[#00D5FF]">{modelsMeta.resource_forecaster?.mae_soc_pct}% SoC</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
