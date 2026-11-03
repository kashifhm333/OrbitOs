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

