import math
import collections
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import IsolationForest

class TelemetryAnomalyDetector:
    """
    Multivariate Telemetry Anomaly Detector using Scikit-learn Isolation Forest
    with an 8-dimensional feature engineering pipeline over a sliding 60-tick window.
    """

    FEATURE_NAMES = [
        "mean_bus_voltage",
        "std_bus_voltage",
        "mean_bus_current",
        "soc_rate_of_change",
        "battery_temp_c",
        "avionics_temp_c",
        "eclipse_flag",
        "net_power_w"
    ]

    def __init__(self, window_size: int = 60, contamination: float = 0.05):
        self.window_size = window_size
        self.contamination = contamination
        # Ring buffer per satellite: satellite_id -> deque of telemetry dicts
        self.buffers: Dict[str, collections.deque] = {}
        # Fault injection overrides per satellite
        self.fault_injections: Dict[str, Dict[str, Any]] = {}

        # Model instance
        self.model = IsolationForest(
            n_estimators=50,
            contamination=contamination,
            random_state=42
        )
        self.is_trained = False
        self._baseline_mean: Optional[np.ndarray] = None
        self._baseline_std: Optional[np.ndarray] = None
        self._init_synthetic_baseline()

    def _init_synthetic_baseline(self):
        """
        Initializes and pre-trains Isolation Forest on 500 ticks of nominal synthetic orbit data.
        """
        np.random.seed(42)
        nominal_features = []

        for i in range(500):
            in_eclipse = (i % 90) > 55  # ~35 min eclipse per 90 min orbit
            v_bus = 28.0 + np.random.normal(0, 0.1) if not in_eclipse else 26.5 + np.random.normal(0, 0.15)
            v_std = 0.08 + np.random.uniform(0, 0.04)
            i_load = 4.2 + np.random.normal(0, 0.2)
            soc_rate = 0.02 if not in_eclipse else -0.04
            t_bat = 22.0 + np.random.normal(0, 0.8)
            t_av = 30.0 + np.random.normal(0, 1.0)
            e_flag = 1.0 if in_eclipse else 0.0
            p_net = (240.0 - 120.0) if not in_eclipse else (-115.0) + np.random.normal(0, 5.0)

            feat = [v_bus, v_std, i_load, soc_rate, t_bat, t_av, e_flag, p_net]
            nominal_features.append(feat)

        X = np.array(nominal_features, dtype=np.float64)
        self._baseline_mean = np.mean(X, axis=0)
        self._baseline_std = np.std(X, axis=0)
        self._baseline_std[self._baseline_std < 1e-4] = 1.0

        # Fit Isolation Forest
        self.model.fit(X)
        self.is_trained = True

    def extract_features(self, buffer: collections.deque) -> np.ndarray:
        """
        Extracts 8-dimensional feature vector from the ring buffer.
        """
        v_list = [t["bus_voltage_v"] for t in buffer]
        i_list = [t["bus_current_a"] for t in buffer]
        soc_list = [t["battery_soc_pct"] for t in buffer]
        t_bat_list = [t["battery_temp_c"] for t in buffer]
        t_av_list = [t.get("avionics_temp_c", 30.0) for t in buffer]
        e_list = [1.0 if t["in_eclipse"] else 0.0 for t in buffer]
        p_net_list = [t["solar_power_w"] - (t["bus_voltage_v"] * t["bus_current_a"]) for t in buffer]

        mean_v = float(np.mean(v_list))
        std_v = max(0.08, float(np.std(v_list)))
        mean_i = float(np.mean(i_list))
        
        # dSoC/dt (difference between start and end of window)
        soc_rate = (soc_list[-1] - soc_list[0]) / max(1.0, float(len(soc_list)))
        latest_t_bat = t_bat_list[-1]
        latest_t_av = t_av_list[-1]
        latest_e = e_list[-1]
        mean_p_net = float(np.mean(p_net_list))

        return np.array([
            mean_v, std_v, mean_i, soc_rate, latest_t_bat, latest_t_av, latest_e, mean_p_net
        ], dtype=np.float64)

    def inject_fault(self, satellite_id: str, fault_type: str, severity: float = 1.0):
        """
        Injects a synthetic subsystem fault (e.g. SOLAR_ARRAY_DROP, THERMAL_RUNAWAY, VOLTAGE_SPIKE).
        """
        self.fault_injections[satellite_id] = {
            "type": fault_type,
            "severity": severity,
            "injected_epoch": datetime.now()
        }

    def clear_fault(self, satellite_id: str):
        if satellite_id in self.fault_injections:
            del self.fault_injections[satellite_id]

    def evaluate_telemetry(self, satellite_id: str, raw_telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes a telemetry tick for a satellite and returns an explainable anomaly report.
        """
        if satellite_id not in self.buffers:
            self.buffers[satellite_id] = collections.deque(maxlen=self.window_size)

        # Apply synthetic fault injection if active
        telemetry = dict(raw_telemetry)
        fault = self.fault_injections.get(satellite_id)
        if fault:
            f_type = fault["type"]
            f_sev = fault["severity"]
            if f_type == "SOLAR_ARRAY_DROP":
                telemetry["solar_power_w"] *= max(0.0, 1.0 - (0.4 * f_sev))
                telemetry["bus_current_a"] *= max(0.0, 1.0 - (0.3 * f_sev))
            elif f_type == "THERMAL_RUNAWAY":
                telemetry["battery_temp_c"] += 15.0 * f_sev
            elif f_type == "VOLTAGE_SPIKE":
                telemetry["bus_voltage_v"] += 8.0 * f_sev

        self.buffers[satellite_id].append(telemetry)

        # Deterministic Safety Fallback (Rule Guard)
        soc = telemetry["battery_soc_pct"]
        temp = telemetry["battery_temp_c"]
        if soc < 15.0 or temp > 55.0:
            return {
                "satellite_id": satellite_id,
                "anomaly_detected": True,
                "anomaly_score": 0.99,
                "severity": "CRITICAL",
                "primary_driver": "battery_soc_pct" if soc < 15.0 else "battery_temp_c",
                "feature_deviations": {
                    "battery_soc_pct": f"{soc:.1f}% (Rule guard: < 15%)",
                    "battery_temp_c": f"{temp:.1f}C (Rule guard: > 55C)"
                },
                "recommended_action": "TRANSITION_TO_SAFE_HOLD"
            }

        # Need at least 5 samples in buffer to compute meaningful stats
        if len(self.buffers[satellite_id]) < 5:
            return {
                "satellite_id": satellite_id,
                "anomaly_detected": False,
                "anomaly_score": 0.1,
                "severity": "NOMINAL",
                "primary_driver": "NONE",
                "feature_deviations": {},
                "recommended_action": "CONTINUE_NOMINAL"
            }

        # ML Feature Extraction & Inference
        features = self.extract_features(self.buffers[satellite_id])
        
        # Isolation Forest score: decision_function yields higher for normal, lower for anomalous
        # Normalizing to [0, 1] where 1.0 is highest anomaly confidence
        raw_score = float(self.model.decision_function([features])[0])
        # decision_function is roughly in [-0.5, 0.5]; convert to anomaly score
        anomaly_score = float(np.clip(1.0 - (raw_score + 0.3) / 0.6, 0.0, 1.0))

        # Check deviations from baseline
        z_scores = (features - self._baseline_mean) / self._baseline_std
        max_idx = int(np.argmax(np.abs(z_scores)))
        primary_driver = self.FEATURE_NAMES[max_idx]

        # Flag anomalous if isolation forest score is elevated (> 0.75) or a significant excursion (|z| > 3.0) occurs
        is_anomalous = bool(anomaly_score > 0.75 or any(abs(z) > 3.0 for z in z_scores))

        deviations = {}
        for idx, name in enumerate(self.FEATURE_NAMES):
            if abs(z_scores[idx]) > 2.0:
                deviations[name] = f"{z_scores[idx]:+.1f} sigma from baseline"

        severity = "NOMINAL"
        rec_action = "CONTINUE_NOMINAL"
        if is_anomalous:
            severity = "WARNING" if anomaly_score < 0.90 else "CRITICAL"
            rec_action = "VERIFY_SUBSYSTEM" if severity == "WARNING" else "TRANSITION_TO_SAFE_HOLD"

        return {
            "satellite_id": satellite_id,
            "anomaly_detected": is_anomalous,
            "anomaly_score": round(anomaly_score, 3),
            "severity": severity,
            "primary_driver": primary_driver if is_anomalous else "NONE",
            "feature_deviations": deviations,
            "recommended_action": rec_action
        }
