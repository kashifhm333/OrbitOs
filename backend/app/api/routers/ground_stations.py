from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math
import numpy as np

from app.ground.passes import DEFAULT_GROUND_STATIONS, check_satellite_contact, predict_contact_windows
from app.simulation.engine import simulation_engine
from app.schemas.schemas import GroundStationResponse

router = APIRouter(prefix="/api/ground-stations", tags=["Ground Stations & Communications"])

@router.get("", response_model=List[GroundStationResponse])
async def list_ground_stations():
    """Returns list of configured global tracking ground stations."""
    return DEFAULT_GROUND_STATIONS

@router.get("/status")
async def get_realtime_visibility():
    """
    Computes real-time geometric visibility between all active satellites and ground stations.
    """
    results = []
    current_epoch = simulation_engine.current_epoch
    
    for sat_id, sat in simulation_engine.satellites.items():
        r_eci = np.array(sat["pos_eci"], dtype=np.float64)
        for st in DEFAULT_GROUND_STATIONS:
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
