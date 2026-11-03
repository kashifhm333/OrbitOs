import uuid
import numpy as np
from fastapi import APIRouter, HTTPException
from typing import List
from app.simulation.engine import simulation_engine
from app.schemas.schemas import CreateSatelliteRequest, SatelliteResponse, OrbitalStateResponse
from app.astrodynamics.converters import keplerian_to_cartesian

router = APIRouter(prefix="/api/v1/satellites", tags=["Satellites"])

@router.get("", response_model=List[SatelliteResponse])
async def list_satellites():
    results = []
    for sat in simulation_engine.satellites.values():
        results.append(SatelliteResponse(
            id=sat["id"],
            name=sat["name"],
            operational_state=sat["operational_state"],
            dry_mass_kg=sat["dry_mass_kg"],
            propellant_mass_kg=sat["propellant_mass_kg"],
            battery_soc_pct=round(sat["battery_soc_pct"], 2),
            position_eci_m=sat["pos_eci"],
            velocity_eci_mps=sat["vel_eci"],
            semi_major_axis_m=sat["a"],
            eccentricity=sat["e"],
            inclination_rad=sat["i"],
            in_eclipse=sat["in_eclipse"],
            is_synthetic=True
        ))
    return results

@router.post("", response_model=SatelliteResponse, status_code=201)
async def create_satellite(req: CreateSatelliteRequest):
    sat_id = f"sat-{str(uuid.uuid4())[:8]}"
    
    a_m = req.semi_major_axis_km * 1000.0
    i_rad = np.radians(req.inclination_deg)
    Omega_rad = np.radians(req.raan_deg)
    omega_rad = np.radians(req.arg_periapsis_deg)
    nu_rad = np.radians(req.true_anomaly_deg)
    
    # Calculate initial position and velocity
    r_eci, v_eci = keplerian_to_cartesian(
        a=a_m,
        e=req.eccentricity,
        i=i_rad,
        Omega=Omega_rad,
        omega=omega_rad,
        nu=nu_rad
    )
    
    sat_data = {
        "id": sat_id,
        "name": req.name,
        "dry_mass_kg": req.dry_mass_kg,
        "propellant_mass_kg": req.propellant_mass_kg,
        "battery_soc_pct": 100.0,
        "operational_state": "ACTIVE",
        "a": a_m,
        "e": req.eccentricity,
        "i": i_rad,
        "Omega": Omega_rad,
        "omega": omega_rad,
        "nu": nu_rad,
        "pos_eci": [float(r_eci[0]), float(r_eci[1]), float(r_eci[2])],
        "vel_eci": [float(v_eci[0]), float(v_eci[1]), float(v_eci[2])],
        "in_eclipse": False,
        "subsystem_status": "NOMINAL",
        "anomaly_score": 0.01
    }
    
    simulation_engine.satellites[sat_id] = sat_data
    
    return SatelliteResponse(
        id=sat_id,
        name=sat_data["name"],
        operational_state=sat_data["operational_state"],
        dry_mass_kg=sat_data["dry_mass_kg"],
        propellant_mass_kg=sat_data["propellant_mass_kg"],
        battery_soc_pct=100.0,
        position_eci_m=sat_data["pos_eci"],
        velocity_eci_mps=sat_data["vel_eci"],
        semi_major_axis_m=sat_data["a"],
        eccentricity=sat_data["e"],
        inclination_rad=sat_data["i"],
        in_eclipse=False,
        is_synthetic=True
    )

@router.get("/{satellite_id}", response_model=SatelliteResponse)
async def get_satellite(satellite_id: str):
    sat = simulation_engine.satellites.get(satellite_id)
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found")
        
    return SatelliteResponse(
        id=sat["id"],
        name=sat["name"],
        operational_state=sat["operational_state"],
        dry_mass_kg=sat["dry_mass_kg"],
        propellant_mass_kg=sat["propellant_mass_kg"],
        battery_soc_pct=round(sat["battery_soc_pct"], 2),
        position_eci_m=sat["pos_eci"],
        velocity_eci_mps=sat["vel_eci"],
        semi_major_axis_m=sat["a"],
        eccentricity=sat["e"],
        inclination_rad=sat["i"],
        in_eclipse=sat["in_eclipse"],
        is_synthetic=True
    )

@router.get("/{satellite_id}/orbit", response_model=OrbitalStateResponse)
async def get_satellite_orbit(satellite_id: str):
    sat = simulation_engine.satellites.get(satellite_id)
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found")
        
    return OrbitalStateResponse(
        satellite_id=sat["id"],
        epoch=simulation_engine.current_epoch,
        position_eci_m=sat["pos_eci"],
        velocity_eci_mps=sat["vel_eci"],
        semi_major_axis_m=sat["a"],
        eccentricity=sat["e"],
        inclination_deg=round(float(np.degrees(sat["i"])), 2),
        true_anomaly_deg=round(float(np.degrees(sat["nu"])), 2)
    )

