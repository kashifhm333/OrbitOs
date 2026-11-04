from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math
import numpy as np

from app.ground.passes import DEFAULT_GROUND_STATIONS, check_satellite_contact, predict_contact_windows
from app.simulation.engine import simulation_engine
from app.schemas.schemas import GroundStationResponse

import uuid
from pydantic import BaseModel, Field

class CreateGroundStationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    latitude_deg: float = Field(ge=-90.0, le=90.0)
    longitude_deg: float = Field(ge=-180.0, le=180.0)
    altitude_m: float = Field(default=0.0, ge=-500.0, le=10000.0)
    min_elevation_deg: float = Field(default=10.0, ge=0.0, le=45.0)

_active_ground_stations = list(DEFAULT_GROUND_STATIONS)

router = APIRouter(tags=["Ground Stations & Communications"])

@router.get("", response_model=List[GroundStationResponse])
async def list_ground_stations():
    """Returns list of configured global tracking ground stations."""
    return _active_ground_stations

@router.post("", response_model=GroundStationResponse, status_code=201)
async def create_ground_station(req: CreateGroundStationRequest):
    """Registers a new tracking ground station."""
    new_station = {
        "id": f"gs-{str(uuid.uuid4())[:8]}",
        "name": req.name,
        "latitude_deg": req.latitude_deg,
        "longitude_deg": req.longitude_deg,
        "altitude_m": req.altitude_m,
        "min_elevation_deg": req.min_elevation_deg,
        "is_active": True
    }
    _active_ground_stations.append(new_station)
    simulation_engine.record_event(
        "GROUND_STATION_REGISTERED",
        f"Ground station {req.name} registered at ({req.latitude_deg}°, {req.longitude_deg}°)",
        "INFO"
    )
    return new_station

@router.delete("/{station_id}")
async def delete_ground_station(station_id: str):
    """Deletes a registered ground station."""
    st = next((s for s in _active_ground_stations if s["id"] == station_id), None)
    if not st:
        raise HTTPException(status_code=404, detail="Ground station not found")
    _active_ground_stations.remove(st)
    return {"status": "DELETED", "station_id": station_id}

@router.get("/station/{station_id}", response_model=GroundStationResponse)
async def get_ground_station_by_id(station_id: str):
    """Retrieves specific ground station details."""
    st = next((s for s in _active_ground_stations if s["id"] == station_id), None)
    if not st:
        raise HTTPException(status_code=404, detail="Ground station not found")
    return st

@router.get("/status")
async def get_realtime_visibility():
    """
    Computes real-time geometric visibility between all active satellites and ground stations.
    """
    results = []
    current_epoch = simulation_engine.current_epoch
    
    for sat_id, sat in simulation_engine.satellites.items():
        r_eci = np.array(sat["pos_eci"], dtype=np.float64)
        for st in _active_ground_stations:
            vis = check_satellite_contact(r_eci, current_epoch, st)
            vis["satellite_id"] = sat["id"]
            vis["satellite_name"] = sat["name"]
            results.append(vis)
            
    return {
        "simulation_epoch": current_epoch.isoformat(),
        "visibility": results
    }

@router.get("/predict/{satellite_id}")
async def get_predicted_passes(
    satellite_id: str,
    horizon_hours: float = Query(24.0, ge=1.0, le=72.0),
    step_seconds: float = Query(60.0, ge=10.0, le=300.0)
):
    """
    Predicts ground station contact passes (AOS, Max Elevation, LOS) for the satellite.
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

    windows = predict_contact_windows(
        keplerian_elements=kepler,
        start_epoch=simulation_engine.current_epoch,
        horizon_hours=horizon_hours,
        step_seconds=step_seconds
    )
    
    formatted = []
    for w in windows:
        item = dict(w)
        item["aos_epoch"] = w["aos_epoch"].isoformat()
        item["los_epoch"] = w["los_epoch"].isoformat()
        item["satellite_id"] = sat["id"]
        item["satellite_name"] = sat["name"]
        formatted.append(item)
        
    return {
        "satellite_id": sat["id"],
        "satellite_name": sat["name"],
        "horizon_hours": horizon_hours,
        "passes": formatted
    }
