import uuid
import numpy as np
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel, Field
from app.simulation.engine import simulation_engine
from app.schemas.schemas import (
    CreateSatelliteRequest,
    UpdateSatelliteRequest,
    SatelliteResponse,
    OrbitalStateResponse
)
from app.astrodynamics.converters import keplerian_to_cartesian
from app.external.ccsds_tle import parse_tle
from app.models.database import AsyncSessionLocal
from app.models.entities import Satellite as SatelliteModel, OrbitalState as OrbitalStateModel
from sqlalchemy import select, delete

router = APIRouter(tags=["Satellites"])

class ImportTLERequest(BaseModel):
    tle_text: str = Field(..., description="Two-Line Element (TLE) string (2 or 3 lines)")
    satellite_name: Optional[str] = Field(None, description="Optional custom name override")
    dry_mass_kg: Optional[float] = Field(150.0, ge=1.0)
    propellant_mass_kg: Optional[float] = Field(15.0, ge=0.0)

@router.post("/import-tle", response_model=SatelliteResponse, status_code=201)
async def import_satellite_tle(req: ImportTLERequest):
    """
    Parses standard NORAD Two-Line Element (TLE) sets and provisions
    the new spacecraft into the active OrbitOS fleet and simulation engine.
    """
    try:
        parsed = parse_tle(req.tle_text, req.satellite_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse TLE: {str(e)}")

    sat_id = f"sat-{parsed['sat_number'].lower()}"
    # If ID exists, generate unique suffix
    if sat_id in simulation_engine.satellites:
        sat_id = f"{sat_id}-{str(uuid.uuid4())[:4]}"

    a_m = parsed["semi_major_axis_m"]
    e = parsed["eccentricity"]
    i_rad = parsed["inclination_rad"]
    Omega_rad = parsed["raan_rad"]
    omega_rad = parsed["arg_periapsis_rad"]
    nu_rad = parsed["true_anomaly_rad"]

    r_eci, v_eci = keplerian_to_cartesian(a_m, e, i_rad, Omega_rad, omega_rad, nu_rad)

    sat_data = {
        "id": sat_id,
        "name": parsed["name"],
        "dry_mass_kg": req.dry_mass_kg or 150.0,
        "propellant_mass_kg": req.propellant_mass_kg or 15.0,
        "battery_soc_pct": 100.0,
        "operational_state": "ACTIVE",
        "a": a_m,
        "e": e,
        "i": i_rad,
        "Omega": Omega_rad,
        "omega": omega_rad,
        "nu": nu_rad,
        "pos_eci": [float(r_eci[0]), float(r_eci[1]), float(r_eci[2])],
        "vel_eci": [float(v_eci[0]), float(v_eci[1]), float(v_eci[2])],
        "in_eclipse": False,
        "subsystem_status": "NOMINAL",
        "anomaly_score": 0.0,
        "bus_voltage_v": 28.2,
        "bus_current_a": 3.6,
        "battery_temp_c": 20.0,
        "avionics_temp_c": 28.0,
        "solar_power_w": 240.0,
        "downlink_rate_mbps": 15.0,
        "comm_link_active": True,
        "active_faults": {}
    }

    simulation_engine.satellites[sat_id] = sat_data
    simulation_engine.record_event(
        "TLE_IMPORTED",
        f"Satellite {sat_data['name']} successfully ingested from standard TLE (NORAD #{parsed['sat_number']})",
        "INFO",
        sat_id
    )

    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                db_sat = SatelliteModel(
                    id=sat_id,
                    name=sat_data["name"],
                    operational_state=sat_data["operational_state"],
                    dry_mass_kg=sat_data["dry_mass_kg"],
                    propellant_mass_kg=sat_data["propellant_mass_kg"],
                    battery_soc_pct=sat_data["battery_soc_pct"],
                    is_synthetic=True
                )
                session.add(db_sat)
    except Exception:
        pass

    return SatelliteResponse(
        id=sat_data["id"],
        name=sat_data["name"],
        operational_state=sat_data["operational_state"],
        dry_mass_kg=sat_data["dry_mass_kg"],
        propellant_mass_kg=sat_data["propellant_mass_kg"],
        battery_soc_pct=round(sat_data["battery_soc_pct"], 2),
        position_eci_m=sat_data["pos_eci"],
        velocity_eci_mps=sat_data["vel_eci"],
        semi_major_axis_m=sat_data["a"],
        eccentricity=sat_data["e"],
        inclination_rad=sat_data["i"],
        in_eclipse=sat_data["in_eclipse"],
        is_synthetic=True
    )

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
        "anomaly_score": 0.01,
        "bus_voltage_v": 28.4,
        "bus_current_a": 3.8,
        "battery_temp_c": 20.0,
        "avionics_temp_c": 30.0,
        "solar_power_w": 240.0,
        "downlink_rate_mbps": 15.0,
        "comm_link_active": True,
        "active_faults": {}
    }
    
    simulation_engine.add_satellite(sat_data)

    # Persist record to database asynchronously
    try:
        async with AsyncSessionLocal() as session:
            sat_record = SatelliteModel(
                id=sat_id,
                simulation_run_id=simulation_engine.simulation_id,
                name=req.name,
                dry_mass_kg=req.dry_mass_kg,
                propellant_mass_kg=req.propellant_mass_kg,
                operational_state="ACTIVE",
                is_synthetic=True
            )
            session.add(sat_record)
            orb_record = OrbitalStateModel(
                satellite_id=sat_id,
                epoch=simulation_engine.current_epoch,
                pos_x_m=float(r_eci[0]),
                pos_y_m=float(r_eci[1]),
                pos_z_m=float(r_eci[2]),
                vel_x_mps=float(v_eci[0]),
                vel_y_mps=float(v_eci[1]),
                vel_z_mps=float(v_eci[2]),
                semi_major_axis_m=a_m,
                eccentricity=req.eccentricity,
                inclination_rad=i_rad,
                raan_rad=Omega_rad,
                arg_periapsis_rad=omega_rad,
                true_anomaly_rad=nu_rad
            )
            session.add(orb_record)
            await session.commit()
    except Exception:
        # Fallback to in-memory runtime engine if database is initializing
        pass
    
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

@router.put("/{satellite_id}", response_model=SatelliteResponse)
@router.patch("/{satellite_id}", response_model=SatelliteResponse)
async def update_satellite(satellite_id: str, req: UpdateSatelliteRequest):
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found")
        
    updates = req.model_dump(exclude_unset=True)
    updated_sat = simulation_engine.update_satellite(sat["id"], updates)

    # Persist updates to DB
    try:
        async with AsyncSessionLocal() as session:
            stmt = select(SatelliteModel).where(SatelliteModel.id == sat["id"])
            res = await session.execute(stmt)
            db_sat = res.scalar_one_or_none()
            if db_sat:
                if req.name:
                    db_sat.name = req.name
                if req.operational_state:
                    db_sat.operational_state = req.operational_state
                if req.dry_mass_kg:
                    db_sat.dry_mass_kg = req.dry_mass_kg
                if req.propellant_mass_kg:
                    db_sat.propellant_mass_kg = req.propellant_mass_kg
                await session.commit()
    except Exception:
        pass

    return SatelliteResponse(
        id=updated_sat["id"],
        name=updated_sat["name"],
        operational_state=updated_sat["operational_state"],
        dry_mass_kg=updated_sat["dry_mass_kg"],
        propellant_mass_kg=updated_sat["propellant_mass_kg"],
        battery_soc_pct=round(updated_sat["battery_soc_pct"], 2),
        position_eci_m=updated_sat["pos_eci"],
        velocity_eci_mps=updated_sat["vel_eci"],
        semi_major_axis_m=updated_sat["a"],
        eccentricity=updated_sat["e"],
        inclination_rad=updated_sat["i"],
        in_eclipse=updated_sat.get("in_eclipse", False),
        is_synthetic=True
    )

@router.delete("/{satellite_id}")
async def delete_satellite(satellite_id: str):
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found")

    target_id = sat["id"]
    simulation_engine.delete_satellite(target_id)

    try:
        async with AsyncSessionLocal() as session:
            stmt = delete(SatelliteModel).where(SatelliteModel.id == target_id)
            await session.execute(stmt)
            await session.commit()
    except Exception:
        pass

    return {
        "status": "DELETED",
        "satellite_id": target_id,
        "message": f"Satellite {sat['name']} decommissioned and deleted from simulation."
    }

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

