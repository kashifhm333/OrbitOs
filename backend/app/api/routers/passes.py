from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List
import numpy as np

from app.ground.passes import DEFAULT_GROUND_STATIONS, predict_contact_windows, check_satellite_contact
from app.simulation.engine import simulation_engine

router = APIRouter(prefix="/api/v1/passes", tags=["Ground Station Passes & Visibility"])

@router.get("/upcoming")
async def get_all_upcoming_passes(
    horizon_hours: float = Query(24.0, ge=1.0, le=72.0)
) -> Dict[str, Any]:
    """Returns all upcoming contact passes across the entire satellite constellation."""
    all_passes = []
    epoch = simulation_engine.current_epoch

    for sat_id, sat in simulation_engine.satellites.items():
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
            start_epoch=epoch,
            horizon_hours=horizon_hours,
            step_seconds=60.0
        )
        for w in windows:
            all_passes.append({
                "satellite_id": sat["id"],
                "satellite_name": sat["name"],
                "ground_station_id": w["ground_station_id"],
                "ground_station_name": w["ground_station_name"],
                "aos_epoch": w["aos_epoch"].isoformat(),
                "los_epoch": w["los_epoch"].isoformat(),
                "duration_seconds": w["duration_seconds"],
                "duration_formatted": f"{int(w['duration_seconds'] // 60)}m {int(w['duration_seconds'] % 60):02d}s",
                "max_elevation_deg": w["max_elevation_deg"],
                "min_range_km": w["min_range_km"],
                "status": "UPCOMING"
            })

    # Sort passes chronologically by AOS epoch
    all_passes.sort(key=lambda x: x["aos_epoch"])

    return {
        "simulation_epoch": epoch.isoformat(),
        "horizon_hours": horizon_hours,
        "count": len(all_passes),
        "passes": all_passes
    }

@router.get("/{satellite_id}")
async def get_satellite_passes(
    satellite_id: str,
    horizon_hours: float = Query(24.0, ge=1.0, le=72.0)
) -> Dict[str, Any]:
    """Returns predicted passes for a specific satellite."""
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
        step_seconds=60.0
    )

    passes = []
    for w in windows:
        passes.append({
            "satellite_id": sat["id"],
            "satellite_name": sat["name"],
            "ground_station_id": w["ground_station_id"],
            "ground_station_name": w["ground_station_name"],
            "aos_epoch": w["aos_epoch"].isoformat(),
            "los_epoch": w["los_epoch"].isoformat(),
            "duration_seconds": w["duration_seconds"],
            "duration_formatted": f"{int(w['duration_seconds'] // 60)}m {int(w['duration_seconds'] % 60):02d}s",
            "max_elevation_deg": w["max_elevation_deg"],
            "min_range_km": w["min_range_km"],
            "status": "UPCOMING"
        })

    return {
        "satellite_id": sat["id"],
        "satellite_name": sat["name"],
        "horizon_hours": horizon_hours,
        "count": len(passes),
        "passes": passes
    }

