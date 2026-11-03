from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
import math
import numpy as np

from app.maneuver.planner import ManeuverPlanner, calculate_fuel_consumption
from app.simulation.engine import simulation_engine
from app.astrodynamics.converters import cartesian_to_keplerian

router = APIRouter(prefix="/api/maneuvers", tags=["Autonomous Maneuver Planning"])

stored_plans: Dict[str, Dict[str, Any]] = {}

def get_sat_kepler(sat: Dict[str, Any]) -> Dict[str, float]:
    return {
        "semi_major_axis_m": sat["a"],
        "eccentricity": sat["e"],
        "inclination_rad": sat["i"],
        "raan_rad": sat["Omega"],
        "arg_periapsis_rad": sat["omega"],
        "true_anomaly_rad": sat["nu"]
    }

@router.post("/plan/{satellite_id}")
async def generate_maneuver_plans(
    satellite_id: str,
    conjunction_id: Optional[str] = None,
    nominal_dv_mps: float = Query(1.0, ge=0.1, le=50.0)
):
    """
    Evaluates and generates candidate collision avoidance maneuver options
    (In-track prograde, retrograde, cross-track, no-action) ranked by utility.
    """
    sat = simulation_engine.satellites.get(satellite_id) or simulation_engine.satellites.get(satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {satellite_id} not found")

    sat_kepler = get_sat_kepler(sat)

    # Find conjunction alert if provided, or take latest alert for this satellite
    alert = None
    if conjunction_id:
        alert = next((a for a in simulation_engine.active_alerts if a.get("id") == conjunction_id), None)
    if not alert:
        alert = next((a for a in simulation_engine.active_alerts if a.get("primary_satellite_id") == sat["id"]), None)

    # If no active alert exists, synthesize a secondary threat orbit
    if alert and "secondary_kepler" in alert:
        sec_kepler = alert["secondary_kepler"]
        tca_epoch = alert["tca_epoch"]
    else:
        sec_kepler = dict(sat_kepler)
        sec_kepler["semi_major_axis_m"] += 500.0
        sec_kepler["true_anomaly_rad"] = (sec_kepler["true_anomaly_rad"] + 0.01) % (2.0 * math.pi)
        tca_epoch = simulation_engine.current_epoch + (datetime.resolution * 7200 * 1000)

    sat_meta = {
        "dry_mass_kg": sat["dry_mass_kg"],
        "propellant_mass_kg": sat["propellant_mass_kg"]
    }

    candidates = ManeuverPlanner.generate_candidates(
        satellite_meta=sat_meta,
        satellite_kepler=sat_kepler,
        secondary_kepler=sec_kepler,
        tca_epoch=tca_epoch if isinstance(tca_epoch, datetime) else datetime.fromisoformat(str(tca_epoch)),
        current_epoch=simulation_engine.current_epoch,
        nominal_dv_mps=nominal_dv_mps
    )

    for c in candidates:
        c["satellite_id"] = sat["id"]
        c["satellite_name"] = sat["name"]
        c["conjunction_id"] = alert.get("id") if alert else "SYNTHETIC-DEBRIS-001"
        stored_plans[c["id"]] = c

    return {
        "satellite_id": sat["id"],
        "satellite_name": sat["name"],
        "candidates_evaluated": len(candidates),
        "recommended_candidate_id": candidates[0]["id"] if candidates else None,
        "candidates": candidates
    }

@router.get("", response_model=List[Dict[str, Any]])
async def list_maneuver_plans():
    """Returns all staged and evaluated maneuver candidate plans."""
    return list(stored_plans.values())

@router.post("/{plan_id}/approve")
async def approve_maneuver_plan(plan_id: str):
    """
    Simulated Operator Approval: Transitions candidate to ARMED state.
    """
    plan = stored_plans.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Maneuver plan not found")
    if not plan.get("is_feasible", False):
        raise HTTPException(status_code=400, detail=f"Cannot approve unfeasible maneuver: {plan.get('rejection_reason')}")

    plan["is_approved"] = True
    plan["status"] = "ARMED"
    plan["approved_at"] = simulation_engine.current_epoch.isoformat()
    return plan

@router.post("/{plan_id}/execute")
async def execute_maneuver_burn(plan_id: str):
    """
    Simulates executing the armed maneuver burn: applies delta-v to satellite state and deducts propellant.
    """
    plan = stored_plans.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Maneuver plan not found")
    if not plan.get("is_approved", False):
        raise HTTPException(status_code=400, detail="Maneuver plan must be approved prior to execution")

    sat_id = plan["satellite_id"]
    sat = simulation_engine.satellites.get(sat_id) or simulation_engine.satellites.get(sat_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {sat_id} not found")

    dv_eci = np.array(plan["delta_v_eci_mps"], dtype=np.float64)
    fuel_used = plan["required_fuel_kg"]

    # Invariant verification: fuel check (SPEC-PRE-002)
    if sat["propellant_mass_kg"] - fuel_used < ManeuverPlanner.RESERVE_FUEL_KG:
        raise HTTPException(status_code=400, detail="SPEC-PRE-002: Insufficient propellant reserve to execute burn")

    # Apply impulse
    v_old = np.array(sat["vel_eci"], dtype=np.float64)
    r_current = np.array(sat["pos_eci"], dtype=np.float64)
    v_new = v_old + dv_eci

    # Update satellite state
    sat["vel_eci"] = v_new.tolist()
    sat["propellant_mass_kg"] = max(0.0, sat["propellant_mass_kg"] - fuel_used)
    a, e, i_rad, om_node, arg_p, nu_rad = cartesian_to_keplerian(r_current, v_new)
    sat["a"] = a
    sat["e"] = e
    sat["i"] = i_rad
    sat["Omega"] = om_node
    sat["omega"] = arg_p
    sat["nu"] = nu_rad

    plan["status"] = "EXECUTED"
    plan["executed_at"] = simulation_engine.current_epoch.isoformat()

    return {
        "status": "SUCCESS",
        "plan_id": plan_id,
        "satellite_id": sat["id"],
        "fuel_consumed_kg": fuel_used,
        "propellant_remaining_kg": round(sat["propellant_mass_kg"], 4),
        "post_burn_semi_major_axis_m": round(sat["a"], 2),
        "message": "Delta-V successfully applied. Orbit elements updated."
    }
