import pytest
import numpy as np
from datetime import datetime, timezone
from app.conjunction.screener import ConjunctionScreener
from app.maneuver.planner import ManeuverPlanner, calculate_fuel_consumption, lvlh_basis_vectors, lvlh_to_eci_deltav

def test_tier1_filter_separated_orbits():
    """TC-COL-001: Distant non-intersecting orbits rejected in O(1) by Tier 1 filter."""
    screener = ConjunctionScreener()
    orbit_leo = {"semi_major_axis_m": 6878137.0, "eccentricity": 0.001}   # ~500 km
    orbit_geo = {"semi_major_axis_m": 42164000.0, "eccentricity": 0.0001} # GEO ~35786 km
    
    passes = screener.tier1_altitude_filter(orbit_leo, orbit_geo, d_thresh_m=50000.0)
    assert passes is False

def test_conjunction_detection_and_risk_classification():
    """TC-COL-002: Identifies close conjunction and assigns CRITICAL risk tier."""
    screener = ConjunctionScreener()
    now = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
    
    # Two orbits close to each other
    orbit_a = {
        "semi_major_axis_m": 6878137.0,
        "eccentricity": 0.001,
        "inclination_deg": 97.4,
        "raan_deg": 0.0,
        "arg_periapsis_deg": 0.0,
        "true_anomaly_deg": 0.0
    }
    # Object B with slightly shifted anomaly
    orbit_b = {
        "semi_major_axis_m": 6878137.0 + 300.0,
        "eccentricity": 0.001,
        "inclination_deg": 97.4,
        "raan_deg": 0.0,
        "arg_periapsis_deg": 0.0,
        "true_anomaly_deg": 0.005
    }
    
    res = screener.screen_pair(
        primary_id="SAT-A", primary_name="Sat A", primary_kepler=orbit_a,
        secondary_id="OBJ-B", secondary_name="Debris B", secondary_kepler=orbit_b,
        start_epoch=now, horizon_hours=2.0, step_coarse_s=30.0
    )
    
    assert res is not None
    assert res["miss_distance_m"] < 1000.0
    assert res["risk_level"] == "CRITICAL"

def test_tsiolkovsky_fuel_equation():
    """Verifies Tsiolkovsky fuel calculation."""
    wet_mass = 100.0  # kg
    dv = 1.0  # m/s
    # delta_m = 100 * (1 - exp(-1 / (220 * 9.80665))) ~ 0.0463 kg
    fuel = calculate_fuel_consumption(wet_mass, dv, isp_s=220.0)
    assert 0.045 < fuel < 0.048

def test_maneuver_candidate_generation():
    """TC-MAN-001 & TC-MAN-002: Generates candidate plans and validates fuel bounds."""
    now = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
    tca = datetime(2026, 11, 4, 14, 0, 0, tzinfo=timezone.utc)
    
    sat_meta = {"dry_mass_kg": 85.0, "propellant_mass_kg": 15.0}
    orbit_sat = {
        "semi_major_axis_m": 6878137.0,
        "eccentricity": 0.001,
        "inclination_deg": 97.4,
        "raan_deg": 0.0,
        "arg_periapsis_deg": 0.0,
        "true_anomaly_deg": 0.0
    }
    orbit_sec = dict(orbit_sat)
    orbit_sec["semi_major_axis_m"] += 200.0
    
    candidates = ManeuverPlanner.generate_candidates(
        satellite_meta=sat_meta,
        satellite_kepler=orbit_sat,
        secondary_kepler=orbit_sec,
        tca_epoch=tca,
        current_epoch=now,
        nominal_dv_mps=2.0
    )
    
    assert len(candidates) == 4
    # Top ranked should be feasible and have utility score
    top = candidates[0]
    assert top["is_feasible"] is True
    assert top["required_fuel_kg"] > 0
    assert top["projected_miss_distance_m"] > 0

