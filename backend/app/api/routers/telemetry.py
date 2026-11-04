from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List
from app.simulation.engine import simulation_engine

router = APIRouter(prefix="/api/v1/telemetry", tags=["Telemetry Data & Subsystem History"])

@router.get("/{satellite_id}/latest")
async def get_latest_telemetry(satellite_id: str) -> Dict[str, Any]:
    """Returns the comprehensive real-time subsystem telemetry for a satellite."""
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {satellite_id} not found")

    pos = sat.get("pos_eci", [0.0, 0.0, 0.0])
    vel = sat.get("vel_eci", [0.0, 0.0, 0.0])
    import numpy as np
    altitude_km = round((float(np.linalg.norm(pos)) - 6378137.0) / 1000.0, 2)
    speed_kmps = round(float(np.linalg.norm(vel)) / 1000.0, 3)

    return {
        "satellite_id": sat["id"],
        "name": sat["name"],
        "epoch": simulation_engine.current_epoch.isoformat(),
        "operational_state": sat["operational_state"],
        "subsystem_status": sat.get("subsystem_status", "NOMINAL"),
        "power": {
            "battery_soc_pct": round(sat["battery_soc_pct"], 2),
            "bus_voltage_v": sat.get("bus_voltage_v", 28.0),
            "bus_current_a": sat.get("bus_current_a", 3.8),
            "solar_power_w": sat.get("solar_power_w", 240.0),
            "in_eclipse": sat.get("in_eclipse", False),
            "power_mode": "BATTERY" if sat.get("in_eclipse", False) else "SOLAR"
        },
        "thermal": {
            "battery_temp_c": sat.get("battery_temp_c", 20.0),
            "avionics_temp_c": sat.get("avionics_temp_c", 30.0),
            "thermal_limit_c": 60.0,
            "status": "NOMINAL" if sat.get("battery_temp_c", 20.0) < 50.0 else "OVERHEAT"
        },
        "orbit": {
            "position_eci_m": sat["pos_eci"],
            "velocity_eci_mps": sat["vel_eci"],
            "altitude_km": altitude_km,
            "speed_kmps": speed_kmps,
            "semi_major_axis_km": round(sat["a"] / 1000.0, 2),
            "eccentricity": sat["e"],
            "inclination_deg": round(float(np.degrees(sat["i"])), 2)
        },
        "communication": {
            "link_active": sat.get("comm_link_active", True),
            "downlink_rate_mbps": sat.get("downlink_rate_mbps", 12.5),
            "signal_strength_dbm": -46.2 if sat.get("comm_link_active", True) else -999.0,
            "uplink_frequency_ghz": 0.432,
            "downlink_frequency_ghz": 8.295
        },
        "active_faults": sat.get("active_faults", {})
    }

@router.get("/{satellite_id}/history")
async def get_telemetry_history(
    satellite_id: str,
    limit: int = Query(50, ge=1, le=200)
) -> Dict[str, Any]:
    """Returns sliding time-series telemetry history for plotting."""
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {satellite_id} not found")

    history = simulation_engine.telemetry_history.get(sat["id"], [])
    selected = history[-limit:]

    return {
        "satellite_id": sat["id"],
        "name": sat["name"],
        "count": len(selected),
        "history": selected
    }

