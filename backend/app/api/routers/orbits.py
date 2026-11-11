import math
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.simulation.engine import simulation_engine
from app.astrodynamics.propagator import propagate_keplerian
from app.astrodynamics.constants import MU_EARTH, R_EARTH
from app.astrodynamics.converters import keplerian_to_cartesian
from app.external.ccsds_tle import parse_ccsds_oem

router = APIRouter(prefix="/api/v1/orbits", tags=["Orbital Parameters & Ephemeris"])

class ImportOEMRequest(BaseModel):
    oem_text: str = Field(..., description="Standard CCSDS Orbit Ephemeris Message (OEM) text in KVN format")
    satellite_id: Optional[str] = Field(None, description="Optional target satellite ID to bind this ephemeris to")

@router.post("/import-oem")
async def import_orbit_oem(req: ImportOEMRequest) -> Dict[str, Any]:
    """
    Parses standard CCSDS Orbit Ephemeris Messages (OEM) and applies
    the ephemeris state to the target satellite or creates a tracked orbital object.
    """
    try:
        parsed_oem = parse_ccsds_oem(req.oem_text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CCSDS OEM: {str(e)}")

    target_id = req.satellite_id or parsed_oem["object_id"].lower()
    kep = parsed_oem["initial_keplerian"]

    if target_id in simulation_engine.satellites:
        sat = simulation_engine.satellites[target_id]
        sat["a"] = kep["semi_major_axis_m"]
        sat["e"] = kep["eccentricity"]
        sat["i"] = kep["inclination_rad"]
        sat["Omega"] = kep["raan_rad"]
        sat["omega"] = kep["arg_periapsis_rad"]
        sat["nu"] = kep["true_anomaly_rad"]
        first_ephem = parsed_oem["ephemeris"][0]
        sat["pos_eci"] = first_ephem["position_eci_m"]
        sat["vel_eci"] = first_ephem["velocity_eci_mps"]
    
    simulation_engine.record_event(
        "OEM_IMPORTED",
        f"CCSDS OEM imported for {parsed_oem['object_name']} ({parsed_oem['ephemeris_count']} ephemeris records)",
        "INFO",
        target_id if target_id in simulation_engine.satellites else None
    )

    return {
        "status": "SUCCESS",
        "object_name": parsed_oem["object_name"],
        "object_id": parsed_oem["object_id"],
        "ephemeris_count": parsed_oem["ephemeris_count"],
        "initial_keplerian": parsed_oem["initial_keplerian"],
        "first_epoch": parsed_oem["ephemeris"][0]["epoch"],
        "last_epoch": parsed_oem["ephemeris"][-1]["epoch"]
    }

class PropagateOrbitRequest(BaseModel):
    semi_major_axis_km: float = Field(ge=6478.137, le=45000.0)
    eccentricity: float = Field(ge=0.0, lt=0.95)
    inclination_deg: float = Field(ge=0.0, le=180.0)
    raan_deg: float = Field(ge=0.0, le=360.0, default=0.0)
    arg_periapsis_deg: float = Field(ge=0.0, le=360.0, default=0.0)
    true_anomaly_deg: float = Field(ge=0.0, le=360.0, default=0.0)
    delta_t_seconds: float = Field(ge=1.0, le=86400.0, default=300.0)

@router.get("/{satellite_id}")
async def get_orbital_parameters(satellite_id: str) -> Dict[str, Any]:
    """Retrieves full astrodynamic Keplerian & Cartesian state of a satellite."""
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {satellite_id} not found")

    a = sat["a"]
    e = sat["e"]
    period_s = 2.0 * math.pi * math.sqrt(a**3 / MU_EARTH)
    periapsis_km = (a * (1.0 - e) - R_EARTH) / 1000.0
    apoapsis_km = (a * (1.0 + e) - R_EARTH) / 1000.0

    r_norm = float(np.linalg.norm(sat["pos_eci"]))
    altitude_km = (r_norm - R_EARTH) / 1000.0
    velocity_kmps = float(np.linalg.norm(sat["vel_eci"])) / 1000.0

    return {
        "satellite_id": sat["id"],
        "name": sat["name"],
        "epoch": simulation_engine.current_epoch.isoformat(),
        "semi_major_axis_m": a,
        "semi_major_axis_km": round(a / 1000.0, 3),
        "eccentricity": e,
        "inclination_deg": round(float(np.degrees(sat["i"])), 4),
        "raan_deg": round(float(np.degrees(sat["Omega"])), 4),
        "arg_periapsis_deg": round(float(np.degrees(sat["omega"])), 4),
        "true_anomaly_deg": round(float(np.degrees(sat["nu"])), 4),
        "orbital_period_seconds": round(period_s, 2),
        "orbital_period_minutes": round(period_s / 60.0, 2),
        "periapsis_altitude_km": round(periapsis_km, 2),
        "apoapsis_altitude_km": round(apoapsis_km, 2),
        "current_altitude_km": round(altitude_km, 2),
        "velocity_kmps": round(velocity_kmps, 3),
        "position_eci_m": sat["pos_eci"],
        "velocity_eci_mps": sat["vel_eci"],
        "frame": "ECI_J2000"
    }

@router.get("/{satellite_id}/trajectory")
async def get_orbital_trajectory(
    satellite_id: str,
    points: int = Query(64, ge=16, le=256)
) -> Dict[str, Any]:
    """Generates 3D orbit track points sampled over one complete orbital revolution."""
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {satellite_id} not found")

    a = sat["a"]
    e = sat["e"]
    i_rad = sat["i"]
    omega_rad = sat["omega"]
    raan_rad = sat["Omega"]

    pts = []
    for k in range(points):
        nu = (2.0 * math.pi * k) / points
        r, _ = keplerian_to_cartesian(a, e, i_rad, raan_rad, omega_rad, nu)
        pts.append({
            "step": k,
            "true_anomaly_deg": round(float(np.degrees(nu)), 2),
            "position_eci_km": [round(float(r[0]) / 1000.0, 2), round(float(r[1]) / 1000.0, 2), round(float(r[2]) / 1000.0, 2)]
        })

    return {
        "satellite_id": sat["id"],
        "points_count": len(pts),
        "trajectory": pts
    }

@router.post("/propagate")
async def propagate_elements(req: PropagateOrbitRequest) -> Dict[str, Any]:
    """Propagates custom Keplerian orbital elements forward in time using Newton-Raphson Kepler solver."""
    a_m = req.semi_major_axis_km * 1000.0
    i_rad = math.radians(req.inclination_deg)
    raan_rad = math.radians(req.raan_deg)
    arg_p_rad = math.radians(req.arg_periapsis_deg)
    nu_0 = math.radians(req.true_anomaly_deg)

    nu_f, r_f, v_f = propagate_keplerian(
        a=a_m,
        e=req.eccentricity,
        i=i_rad,
        Omega=raan_rad,
        omega=arg_p_rad,
        nu_0=nu_0,
        delta_t=req.delta_t_seconds
    )

    return {
        "initial_true_anomaly_deg": req.true_anomaly_deg,
        "delta_t_seconds": req.delta_t_seconds,
        "final_true_anomaly_deg": round(float(np.degrees(nu_f)), 4),
        "position_eci_m": [float(r_f[0]), float(r_f[1]), float(r_f[2])],
        "velocity_eci_mps": [float(v_f[0]), float(v_f[1]), float(v_f[2])],
        "altitude_km": round((float(np.linalg.norm(r_f)) - R_EARTH) / 1000.0, 2)
    }

