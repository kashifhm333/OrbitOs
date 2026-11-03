import pytest
from datetime import datetime, timezone
from app.ml.anomaly_detector import TelemetryAnomalyDetector
from app.ml.forecaster import ResourceForecaster

def test_nominal_telemetry_evaluation():
    """TC-AIML-001: Nominal telemetry stream generates low anomaly score."""
    detector = TelemetryAnomalyDetector()
    sat_id = "SAT-001"
    
    # Feed 10 nominal telemetry steps
    report = None
    for i in range(10):
        report = detector.evaluate_telemetry(sat_id, {
            "bus_voltage_v": 28.0,
            "bus_current_a": 4.2,
            "battery_soc_pct": 95.0,
            "battery_temp_c": 22.0,
            "avionics_temp_c": 30.0,
            "solar_power_w": 240.0,
            "in_eclipse": False
        })
        
    assert report is not None
    assert report["anomaly_detected"] is False
    assert report["severity"] == "NOMINAL"

def test_solar_fault_injection():
    """TC-AIML-002: Injected solar panel loss triggers anomaly detection."""
    detector = TelemetryAnomalyDetector()
    sat_id = "SAT-002"
    
    # Prime buffer with nominal
    for _ in range(8):
        detector.evaluate_telemetry(sat_id, {
            "bus_voltage_v": 28.0,
            "bus_current_a": 4.2,
            "battery_soc_pct": 95.0,
            "battery_temp_c": 22.0,
            "avionics_temp_c": 30.0,
            "solar_power_w": 240.0,
            "in_eclipse": False
        })
        
    # Inject fault: sudden drop in solar generation
    detector.inject_fault(sat_id, "SOLAR_ARRAY_DROP", severity=1.5)
    
    report = None
    for _ in range(5):
        report = detector.evaluate_telemetry(sat_id, {
            "bus_voltage_v": 28.0,
            "bus_current_a": 4.2,
            "battery_soc_pct": 95.0,
            "battery_temp_c": 22.0,
            "avionics_temp_c": 30.0,
            "solar_power_w": 240.0,
            "in_eclipse": False
        })
        
    assert report is not None
    assert report["anomaly_detected"] is True

def test_rule_guard_deterministic_fallback():
    """TC-AIML-004: Critical SoC (<15%) or temp (>55C) trips deterministic safety guard."""
    detector = TelemetryAnomalyDetector()
    sat_id = "SAT-003"
    
    report = detector.evaluate_telemetry(sat_id, {
        "bus_voltage_v": 21.0,
        "bus_current_a": 2.0,
        "battery_soc_pct": 12.0,  # < 15% threshold
        "battery_temp_c": 22.0,
        "avionics_temp_c": 30.0,
        "solar_power_w": 0.0,
        "in_eclipse": True
    })
    
    assert report["anomaly_detected"] is True
    assert report["severity"] == "CRITICAL"
    assert report["recommended_action"] == "TRANSITION_TO_SAFE_HOLD"

def test_resource_forecaster_24h():
    """Tests 24-hour battery and propellant forecast projection."""
    now = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
    orbit = {
        "semi_major_axis_m": 6878137.0,
        "eccentricity": 0.001,
        "inclination_deg": 97.4,
        "raan_deg": 0.0,
        "arg_periapsis_deg": 0.0,
        "true_anomaly_deg": 0.0
    }
    
    forecast = ResourceForecaster.forecast_resources(
        satellite_meta={"id": "SAT-TEST", "name": "Test Sat"},
        keplerian_elements=orbit,
        start_epoch=now,
        current_soc_pct=90.0,
        current_propellant_kg=15.0,
        horizon_hours=24.0,
        step_minutes=10.0
    )
    
    assert forecast["horizon_hours"] == 24.0
    assert len(forecast["trajectory"]) > 20
    assert forecast["final_predicted_propellant_kg"] <= 15.0
    # Every trajectory point has 95% confidence intervals
    for pt in forecast["trajectory"]:
        assert pt["lower_ci_95"] <= pt["predicted_soc_pct"] <= pt["upper_ci_95"]

