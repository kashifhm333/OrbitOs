from fastapi import APIRouter, Query, HTTPException, Response
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math
import uuid

from app.simulation.engine import simulation_engine
from app.conjunction.screener import ConjunctionScreener
from app.external.ccsds_tle import generate_ccsds_cdm

router = APIRouter(tags=["Conjunction Detection & Risk Analysis"])

screener = ConjunctionScreener(filter_threshold_km=50.0)

def extract_sat_kepler(sat: Dict[str, Any]) -> Dict[str, float]:
    return {
        "semi_major_axis_m": sat["a"],
        "eccentricity": sat["e"],
        "inclination_rad": sat["i"],
        "raan_rad": sat["Omega"],
        "arg_periapsis_rad": sat["omega"],
        "true_anomaly_rad": sat["nu"]
    }

@router.get("", response_model=List[Dict[str, Any]])
@router.get("/active", response_model=List[Dict[str, Any]])
async def list_conjunction_alerts():
    """Returns active conjunction alerts currently flagged by the simulation engine."""
    return simulation_engine.active_alerts

@router.post("/screen-all")
@router.post("/screen")
async def trigger_full_conjunction_screening(
    horizon_hours: float = Query(24.0, ge=1.0, le=72.0),
    step_seconds: float = Query(60.0, ge=10.0, le=300.0)
):
    """
    Executes 3-tier conjunction screening across all satellite pairs and synthetic orbital debris.
    """
    sat_list = list(simulation_engine.satellites.values())
    now = simulation_engine.current_epoch
    detected = []

    # 1. Screen fleet satellites against each other
    for i in range(len(sat_list)):
        for j in range(i + 1, len(sat_list)):
            sat_a = sat_list[i]
            sat_b = sat_list[j]
            kepler_a = extract_sat_kepler(sat_a)
            kepler_b = extract_sat_kepler(sat_b)
            res = screener.screen_pair(
                primary_id=sat_a["id"],
                primary_name=sat_a["name"],
                primary_kepler=kepler_a,
                secondary_id=sat_b["id"],
                secondary_name=sat_b["name"],
                secondary_kepler=kepler_b,
                start_epoch=now,
                horizon_hours=horizon_hours,
                step_coarse_s=step_seconds
            )
            if res:
                res["id"] = str(uuid.uuid4())
                res["secondary_kepler"] = kepler_b
                detected.append(res)

    # 2. Also screen against synthetic resident space debris (e.g. DEBRIS-COSMOS-2251)
    debris_orbit = {
        "semi_major_axis_m": 6878137.0 + 800.0,
        "eccentricity": 0.0015,
        "inclination_rad": 1.70,
        "raan_rad": 0.05,
        "arg_periapsis_rad": 0.0,
        "true_anomaly_rad": 0.02
    }

    for sat in sat_list:
        kepler_sat = extract_sat_kepler(sat)
        res = screener.screen_pair(
            primary_id=sat["id"],
            primary_name=sat["name"],
            primary_kepler=kepler_sat,
            secondary_id="DEBRIS-COSMOS-2251",
            secondary_name="Cosmos 2251 Fragment #4812",
            secondary_kepler=debris_orbit,
            start_epoch=now,
            horizon_hours=horizon_hours,
            step_coarse_s=step_seconds
        )
        if res:
            res["id"] = str(uuid.uuid4())
            res["secondary_kepler"] = debris_orbit
            detected.append(res)

    # Update simulation active alerts
    simulation_engine.active_alerts = detected

    return {
        "status": "COMPLETED",
        "screened_at": now.isoformat(),
        "horizon_hours": horizon_hours,
        "conjunctions_flagged": len(detected),
        "conjunctions": detected
    }

@router.get("/{conjunction_id}")
async def get_conjunction_event(conjunction_id: str):
    """Retrieves specific details of a flagged close approach event."""
    alert = next((a for a in simulation_engine.active_alerts if a.get("id") == conjunction_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Conjunction event not found")
    return alert

@router.get("/{conjunction_id}/export-cdm")
async def export_conjunction_cdm(conjunction_id: str):
    """
    Exports a flagged conjunction event as a standard CCSDS Conjunction Data Message (CDM).
    Complies with CCSDS 508.0-B-1 (Blue Book standard).
    """
    alert = next((a for a in simulation_engine.active_alerts if a.get("id") == conjunction_id), None)
    if not alert:
        # If active alerts list is empty or ID not found, check if synthetic pair can be generated
        raise HTTPException(status_code=404, detail=f"Conjunction event {conjunction_id} not found in active alerts")

    cdm_kvn = generate_ccsds_cdm(alert)
    return Response(
        content=cdm_kvn,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=cdm_{conjunction_id[:8]}.txt"}
    )
