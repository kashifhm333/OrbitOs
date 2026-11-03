from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from app.ml.anomaly_detector import TelemetryAnomalyDetector
from app.ml.forecaster import ResourceForecaster
from app.simulation.engine import simulation_engine

router = APIRouter(prefix="/api/intelligence", tags=["AI/ML Telemetry Intelligence"])

anomaly_detector = TelemetryAnomalyDetector()

class FaultInjectionRequest(BaseModel):
    satellite_id: str
    fault_type: str = Field(description="SOLAR_ARRAY_DROP, THERMAL_RUNAWAY, VOLTAGE_SPIKE")
    severity: float = Field(default=1.0, ge=0.1, le=2.0)

@router.get("/anomaly/{satellite_id}")
async def get_satellite_anomaly_report(satellite_id: str):
    """
    Evaluates current telemetry for the specified satellite using the Isolation Forest model.
    """
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {satellite_id} not found")

    in_ecl = sat.get("in_eclipse", False)
    telemetry = {
        "bus_voltage_v": 28.0 if not in_ecl else 26.5,
        "bus_current_a": 4.5,
        "battery_soc_pct": sat["battery_soc_pct"],
        "battery_temp_c": 22.0,
        "avionics_temp_c": 32.0,
        "solar_power_w": 240.0 if not in_ecl else 0.0,
        "in_eclipse": in_ecl
    }

    report = anomaly_detector.evaluate_telemetry(sat["id"], telemetry)
    return report

@router.post("/fault-inject")
async def inject_satellite_fault(payload: FaultInjectionRequest):
    """
    Injects a synthetic telemetry anomaly (e.g. SOLAR_ARRAY_DROP, THERMAL_RUNAWAY)
    to test the machine learning detection and explainability response.
    """
    sat = simulation_engine.satellites.get(payload.satellite_id) or simulation_engine.satellites.get(payload.satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {payload.satellite_id} not found")

    anomaly_detector.inject_fault(sat["id"], payload.fault_type, payload.severity)
    return {
        "status": "FAULT_INJECTED",
        "satellite_id": sat["id"],
        "satellite_name": sat["name"],
        "fault_type": payload.fault_type,
        "severity": payload.severity,
        "message": f"Injected {payload.fault_type} anomaly into satellite telemetry stream."
    }

@router.post("/fault-clear/{satellite_id}")
async def clear_satellite_fault(satellite_id: str):
    """
    Clears any active synthetic fault injection for the specified satellite.
    """
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    target_id = sat["id"] if sat else satellite_id
    anomaly_detector.clear_fault(target_id)
    return {
        "status": "FAULT_CLEARED",
        "satellite_id": target_id
    }

@router.get("/forecast/{satellite_id}")
async def get_resource_forecast(
    satellite_id: str,
    horizon_hours: float = Query(24.0, ge=1.0, le=48.0)
):
    """
    Computes 24-hour predictive trajectory of battery State of Charge (SoC) and propellant mass.
    """
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {satellite_id} not found")

    kepler = {
        "semi_major_axis_m": sat["a"],
        "eccentricity": sat["e"],
        "inclination_rad": sat["i"],
        "raan_rad": sat["Omega"],
        "arg_periapsis_rad": sat["omega"],
        "true_anomaly_rad": sat["nu"]
    }

    forecast = ResourceForecaster.forecast_resources(
        satellite_meta={"id": sat["id"], "name": sat["name"]},
        keplerian_elements=kepler,
        start_epoch=simulation_engine.current_epoch,
        current_soc_pct=sat["battery_soc_pct"],
        current_propellant_kg=sat["propellant_mass_kg"],
        horizon_hours=horizon_hours
    )
    return forecast
