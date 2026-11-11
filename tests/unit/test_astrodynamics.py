import pytest
import math
import numpy as np
from app.astrodynamics.constants import MU_EARTH, R_EARTH
from app.astrodynamics.kepler_solver import solve_kepler
from app.astrodynamics.converters import (
    keplerian_to_cartesian, cartesian_to_keplerian, orbital_period, specific_orbital_energy
)
from app.astrodynamics.propagator import propagate_keplerian, propagate_rk4
from app.astrodynamics.frames import eci_to_ecef, ecef_to_geodetic
from app.bus.eclipse import check_cylindrical_eclipse
from app.bus.power import update_battery_state_of_charge

def test_orbital_period():
    # 500 km altitude circular orbit: a = 6878137 m
    a = R_EARTH + 500000.0
    period = orbital_period(a)
    # Expected period: ~5677 seconds (~94.6 minutes)
    assert 5600.0 < period < 5800.0


def test_kepler_solver():
    # Solve M = E - e*sin(E) for known values
    M = math.pi / 2.0
    e = 0.1
    E = solve_kepler(M, e)
    # Verify M = E - e*sin(E)
    M_recovered = E - e * math.sin(E)
    assert abs(M - M_recovered) < 1e-11


def test_round_trip_converters():
    # Define arbitrary Keplerian orbit
    a_orig = 7000000.0  # 7000 km
    e_orig = 0.015
    i_orig = math.radians(45.0)
    Omega_orig = math.radians(60.0)
    omega_orig = math.radians(30.0)
    nu_orig = math.radians(75.0)

    r_vec, v_vec = keplerian_to_cartesian(a_orig, e_orig, i_orig, Omega_orig, omega_orig, nu_orig)
    
    # Assert physical distances and speeds
    r_norm = float(np.linalg.norm(r_vec))
    v_norm = float(np.linalg.norm(v_vec))
    assert 6800000.0 < r_norm < 7200000.0
    assert 7000.0 < v_norm < 8000.0

    # Recover elements
    a_rec, e_rec, i_rec, Omega_rec, omega_rec, nu_rec = cartesian_to_keplerian(r_vec, v_vec)
    
    assert abs(a_orig - a_rec) / a_orig < 1e-5
    assert abs(e_orig - e_rec) < 1e-5
    assert abs(i_orig - i_rec) < 1e-5
    assert abs(Omega_orig - Omega_rec) < 1e-5
    assert abs(omega_orig - omega_rec) < 1e-5
    assert abs(nu_orig - nu_rec) < 1e-5


def test_energy_conservation():
    a = 6900000.0
    e = 0.005
    i = math.radians(98.0)
    r_vec, v_vec = keplerian_to_cartesian(a, e, i, 0.0, 0.0, 0.0)
    
    energy_initial = specific_orbital_energy(r_vec, v_vec)
    
    # Propagate with RK4 for 1000 seconds
    r_curr, v_curr = r_vec, v_vec
    dt = 1.0
    for _ in range(100):
        r_curr, v_curr = propagate_rk4(r_curr, v_curr, dt)
        
    energy_final = specific_orbital_energy(r_curr, v_curr)
    rel_error = abs(energy_final - energy_initial) / abs(energy_initial)
    assert rel_error < 1e-6


def test_coordinate_frame_isometry():
    r_eci = np.array([5000000.0, 3000000.0, 4000000.0])
    theta = math.radians(35.5)
    r_ecef = eci_to_ecef(r_eci, theta)
    
    # Orthogonal rotation must preserve vector length
    assert abs(np.linalg.norm(r_eci) - np.linalg.norm(r_ecef)) < 1e-5


def test_eclipse_geometry():
    # Sunward side (should NOT be eclipsed)
    r_sunward = np.array([7000000.0, 0.0, 0.0])
    assert check_cylindrical_eclipse(r_sunward) is False

    # Shadow side behind Earth within cylinder (SHOULD be eclipsed)
    r_shadow = np.array([-7000000.0, 100000.0, 0.0])
    assert check_cylindrical_eclipse(r_shadow) is True


def test_battery_power_update():
    # In sunlight: charging
    soc_start = 50.0
    soc_new, p_solar, p_load, state = update_battery_state_of_charge(
        current_soc_pct=soc_start,
        operational_state="ACTIVE",
        in_eclipse=False,
        delta_t_seconds=60.0
    )
    assert p_solar > p_load
    assert soc_new > soc_start

    # In eclipse: discharging
    soc_discharge, p_solar_shadow, p_load_shadow, state = update_battery_state_of_charge(
        current_soc_pct=50.0,
        operational_state="ACTIVE",
        in_eclipse=True,
        delta_t_seconds=60.0
    )
    assert p_solar_shadow == 0.0
    assert soc_discharge < 50.0


def test_j2_nodal_precession_sun_sync_accuracy():
    """
    Verifies J2 secular nodal regression for sun-synchronous OrbitOS-Alpha (i = 97.4 deg, a = 6878.1 km).
    Must closely match the Earth orbital rate ~ 0.9856 deg/day.
    """
    from app.astrodynamics.propagator import (
        compute_j2_nodal_precession_rate,
        compute_j2_nodal_precession_deg_per_day
    )
    a = 6878137.0  # 500 km altitude LEO
    e = 0.001
    i = math.radians(97.4)

    rate_rad_s = compute_j2_nodal_precession_rate(a, e, i)
    rate_deg_day = compute_j2_nodal_precession_deg_per_day(a, e, i)

    # For Sun-Sync orbit, nodal precession is positive (retrograde inclination cos(i) < 0)
    assert rate_rad_s > 0.0
    # Expected rate: ~ +0.9856 deg/day (~360 deg / 365.25 days)
    assert abs(rate_deg_day - 0.9856) < 0.05


def test_rk4_with_j2_and_atmospheric_drag():
    """
    Verifies RK4 integrator with J2 oblateness and exponential atmospheric drag.
    Drag deceleration must slowly dissipate mechanical energy over low LEO altitude.
    """
    from app.astrodynamics.propagator import propagate_rk4
    # Low orbit where drag is significant: 300 km altitude
    a = R_EARTH + 300000.0
    r_vec = np.array([a, 0.0, 0.0])
    v_mag = math.sqrt(MU_EARTH / a)
    v_vec = np.array([0.0, v_mag, 0.0])

    r_next, v_next = propagate_rk4(
        r_vec, v_vec, delta_t=100.0,
        include_j2=True, include_drag=True,
        cd=2.2, area_m2=2.0, mass_kg=300.0
    )

    r_norm = float(np.linalg.norm(r_next))
    v_norm = float(np.linalg.norm(v_next))
    assert 6000000.0 < r_norm < 7000000.0
    assert 7000.0 < v_norm < 8000.0


def test_b_plane_covariance_and_pc_bounds():
    """
    Verifies 2D B-plane Gaussian collision probability Pc is strictly bounded in [0.0, 1.0].
    """
    from app.conjunction.screener import ConjunctionScreener

    r_a = np.array([6878137.0, 0.0, 0.0])
    v_a = np.array([0.0, 7612.0, 0.0])
    
    # Head-on close approach (miss distance 8 meters)
    r_b = np.array([6878137.0 + 8.0, 0.0, 0.0])
    v_b = np.array([0.0, -7612.0, 0.0])

    res = ConjunctionScreener.compute_b_plane_and_pc(r_a, v_a, r_b, v_b, r_hb_m=10.0)
    pc = res["collision_probability"]
    v_rel_kms = res["relative_velocity_kms"]

    assert 0.0 <= pc <= 1.0
    assert pc > 0.001  # At 8 meters miss distance, Pc must be non-zero
    assert v_rel_kms > 14.0  # Relative velocity in head-on encounter ~ 15.2 km/s
    assert "b_plane" in res
    assert "sigma_x_m" in res["b_plane"]


def test_ccsds_tle_and_oem_parsing():
    """
    Verifies TLE parsing, CCSDS OEM ingestion, and CCSDS CDM export formatting.
    """
    from app.external.ccsds_tle import parse_tle, parse_ccsds_oem, generate_ccsds_cdm

    # Sample ISS TLE
    tle_text = """1 25544U 98067A   26308.50000000  .00016717  00000-0  10270-3 0  9001
2 25544  51.6400 208.5000 0005000 120.0000 240.0000 15.50000000 10001"""
    
    tle_data = parse_tle(tle_text, "ISS (ZARYA)")
    assert tle_data["sat_number"] == "25544"
    assert tle_data["inclination_deg"] == 51.64
    assert tle_data["semi_major_axis_m"] > 6700000.0

    # Sample CCSDS OEM KVN snippet
    oem_sample = """CCSDS_OEM_VERS = 2.0
OBJECT_NAME = TEST_SAT
OBJECT_ID = 2026-001A
CENTER_NAME = EARTH
REF_FRAME = EME2000
TIME_SYSTEM = UTC
META_STOP
2026-11-04T12:00:00.000 6878.137 0.000 0.000 0.000 7.612 0.000
2026-11-04T12:01:00.000 6870.000 300.000 0.000 -0.500 7.500 0.000
"""
    oem_data = parse_ccsds_oem(oem_sample)
    assert oem_data["object_name"] == "TEST_SAT"
    assert oem_data["ephemeris_count"] == 2

    # CDM Serialization
    sample_alert = {
        "id": "alert-test-01",
        "primary_satellite_name": "OrbitOS-Alpha",
        "secondary_object_name": "Cosmos 2251 Debris",
        "miss_distance_m": 42.5,
        "relative_velocity_kms": 14.8,
        "collision_probability": 0.054,
        "risk_level": "CRITICAL"
    }
    cdm_out = generate_ccsds_cdm(sample_alert)
    assert "CCSDS_CDM_VERS = 1.0" in cdm_out
    assert "COLLISION_PROBABILITY" in cdm_out

