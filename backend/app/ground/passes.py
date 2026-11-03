import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import numpy as np

from app.astrodynamics.frames import earth_rotation_angle, eci_to_ecef
from app.astrodynamics.propagator import propagate_orbit_keplerian
from app.ground.coordinates import geodetic_to_ecef, calculate_az_el_range, compute_fspl_db

# Default Ground Stations
DEFAULT_GROUND_STATIONS = [
    {
        "id": "GS-SVAL",
        "name": "Svalbard Satellite Station",
        "latitude_deg": 78.2297,
        "longitude_deg": 15.4077,
        "altitude_m": 400.0,
        "min_elevation_deg": 5.0,
        "is_active": True
    },
    {
        "id": "GS-SGP",
        "name": "Singapore Earth Station",
        "latitude_deg": 1.3521,
        "longitude_deg": 103.8198,
        "altitude_m": 30.0,
        "min_elevation_deg": 10.0,
        "is_active": True
    },
    {
        "id": "GS-SCL",
        "name": "Santiago Tracking Station",
        "latitude_deg": -33.1500,
        "longitude_deg": -70.6667,
        "altitude_m": 720.0,
        "min_elevation_deg": 10.0,
        "is_active": True
    }
]

def check_satellite_contact(
    r_sat_eci: Any,
    epoch: datetime,
    station: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes instantaneous visibility between a satellite ECI position and a ground station.
    """
    r_sat_np = np.array(r_sat_eci, dtype=np.float64)
    theta_era = earth_rotation_angle(epoch)
    r_sat_ecef = eci_to_ecef(r_sat_np, theta_era)
    
    r_gs_ecef = geodetic_to_ecef(
        lat_deg=station["latitude_deg"],
        lon_deg=station["longitude_deg"],
        alt_m=station["altitude_m"]
    )
    
    az_deg, el_deg, slant_range_m = calculate_az_el_range(
        r_sat_ecef=r_sat_ecef,
        r_gs_ecef=r_gs_ecef,
        lat_deg=station["latitude_deg"],
        lon_deg=station["longitude_deg"]
    )
    
    min_el = station.get("min_elevation_deg", 10.0)
    in_contact = el_deg >= min_el
    fspl_db = compute_fspl_db(slant_range_m) if in_contact else 0.0
    
    return {
        "ground_station_id": station["id"],
        "ground_station_name": station["name"],
        "in_contact": in_contact,
        "elevation_deg": round(el_deg, 2),
        "azimuth_deg": round(az_deg, 2),
        "slant_range_km": round(slant_range_m / 1000.0, 2),
        "fspl_db": round(fspl_db, 1),
        "downlink_rate_kbps": 1000.0 if in_contact else 0.0
    }


def predict_contact_windows(
    keplerian_elements: Dict[str, float],
    start_epoch: datetime,
    horizon_hours: float = 24.0,
    step_seconds: float = 30.0,
    stations: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """
    Predicts ground station contact passes over a future time horizon using Keplerian propagation.
    Identifies AOS (Acquisition of Signal), Max Elevation, and LOS (Loss of Signal).
    """
    if stations is None:
        stations = DEFAULT_GROUND_STATIONS
        
    windows: List[Dict[str, Any]] = []
    total_steps = int((horizon_hours * 3600.0) / step_seconds)
    
    # Precompute ECEF positions of ground stations
    gs_cache = []
    for st in stations:
        if not st.get("is_active", True):
            continue
        r_gs = geodetic_to_ecef(st["latitude_deg"], st["longitude_deg"], st["altitude_m"])
        gs_cache.append({
            "meta": st,
            "r_ecef": r_gs,
            "active_pass": None
        })

    for step_idx in range(total_steps):
        t_offset = step_idx * step_seconds
        current_time = start_epoch + timedelta(seconds=t_offset)
        
        # Propagate satellite keplerian orbit
        r_eci, _ = propagate_orbit_keplerian(keplerian_elements, t_offset)
        theta_era = earth_rotation_angle(current_time)
        r_ecef = eci_to_ecef(r_eci, theta_era)
        
        for gs in gs_cache:
            st = gs["meta"]
            _, el_deg, range_m = calculate_az_el_range(
                r_sat_ecef=r_ecef,
                r_gs_ecef=gs["r_ecef"],
                lat_deg=st["latitude_deg"],
                lon_deg=st["longitude_deg"]
            )
            
            is_above_mask = el_deg >= st["min_elevation_deg"]
            
            if is_above_mask:
                if gs["active_pass"] is None:
                    # AOS
                    gs["active_pass"] = {
                        "ground_station_id": st["id"],
                        "ground_station_name": st["name"],
                        "aos_epoch": current_time,
                        "los_epoch": current_time,
                        "max_elevation_deg": el_deg,
                        "min_range_km": range_m / 1000.0,
                        "status": "UPCOMING"
                    }
                else:
                    # Update Max Elevation
                    if el_deg > gs["active_pass"]["max_elevation_deg"]:
                        gs["active_pass"]["max_elevation_deg"] = el_deg
                        gs["active_pass"]["min_range_km"] = range_m / 1000.0
                    gs["active_pass"]["los_epoch"] = current_time
            else:
                if gs["active_pass"] is not None:
                    # LOS - finalize pass
                    p = gs["active_pass"]
                    p["duration_seconds"] = (p["los_epoch"] - p["aos_epoch"]).total_seconds()
                    # Only keep valid passes with duration >= step_seconds
                    if p["duration_seconds"] >= step_seconds:
                        p["max_elevation_deg"] = round(p["max_elevation_deg"], 2)
                        p["min_range_km"] = round(p["min_range_km"], 2)
                        windows.append(p)
                    gs["active_pass"] = None

    # Handle any passes currently open at horizon end
    for gs in gs_cache:
        if gs["active_pass"] is not None:
            p = gs["active_pass"]
            p["duration_seconds"] = (p["los_epoch"] - p["aos_epoch"]).total_seconds()
            p["max_elevation_deg"] = round(p["max_elevation_deg"], 2)
            p["min_range_km"] = round(p["min_range_km"], 2)
            windows.append(p)

    windows.sort(key=lambda x: x["aos_epoch"])
    return windows
