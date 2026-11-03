import math
import numpy as np
from typing import Tuple, Dict, Any
from app.astrodynamics.constants import MU_EARTH, R_EARTH, J2_EARTH
from app.astrodynamics.kepler_solver import (
    solve_kepler, true_anomaly_from_eccentric, eccentric_from_true_anomaly
)
from app.astrodynamics.converters import keplerian_to_cartesian

def propagate_keplerian(
    a: float, e: float, i: float, Omega: float, omega: float, nu_0: float, 
    delta_t: float, mu: float = MU_EARTH
) -> Tuple[float, np.ndarray, np.ndarray]:
    """
    Propagates unperturbed two-body Keplerian elements forward by delta_t seconds.
    
    Returns:
        (new_true_anomaly_rad, position_eci_m, velocity_eci_mps)
    """
    # Mean motion n in rad/s
    n = math.sqrt(mu / (a ** 3))
    
    # Eccentric anomaly at t0
    E_0 = eccentric_from_true_anomaly(nu_0, e)
    
    # Mean anomaly at t0
    M_0 = E_0 - e * math.sin(E_0)
    
    # Advance Mean Anomaly
    M_t = (M_0 + n * delta_t) % (2.0 * math.pi)
    
    # Solve Kepler's equation for updated E_t
    E_t = solve_kepler(M_t, e)
    
    # Updated true anomaly
    nu_t = true_anomaly_from_eccentric(E_t, e)
    
    # Compute Cartesian state
    r_eci, v_eci = keplerian_to_cartesian(a, e, i, Omega, omega, nu_t, mu=mu)
    return nu_t, r_eci, v_eci


def propagate_orbit_keplerian(elements: Any, delta_t: float, mu: float = MU_EARTH) -> Tuple[np.ndarray, np.ndarray]:
    """
    Convenience wrapper accepting a Keplerian dictionary or tuple (a, e, i, Omega, omega, nu)
    and propagating by delta_t seconds.
    Returns:
        (position_eci_m, velocity_eci_mps)
    """
    if isinstance(elements, (tuple, list)):
        a, e, i, Omega, omega, nu = elements[:6]
    else:
        a = elements["semi_major_axis_m"]
        e = elements["eccentricity"]
        i = elements.get("inclination_rad", math.radians(elements.get("inclination_deg", 0.0)))
        Omega = elements.get("raan_rad", math.radians(elements.get("raan_deg", 0.0)))
        omega = elements.get("arg_periapsis_rad", math.radians(elements.get("arg_periapsis_deg", 0.0)))
        nu = elements.get("true_anomaly_rad", math.radians(elements.get("true_anomaly_deg", 0.0)))
    
    _, r_eci, v_eci = propagate_keplerian(a, e, i, Omega, omega, nu, delta_t, mu=mu)
    return r_eci, v_eci


def compute_acceleration(r_vec: np.ndarray, include_j2: bool = False, mu: float = MU_EARTH) -> np.ndarray:
    """Computes gravitational acceleration vector at position r_vec."""
    r = np.linalg.norm(r_vec)
    r3 = r ** 3
    a_grav = -(mu / r3) * r_vec
    
    if not include_j2:
        return a_grav
        
    # J2 Geopotential perturbation
    z2_r2 = (r_vec[2] / r) ** 2
    factor = -(1.5 * J2_EARTH * mu * (R_EARTH ** 2)) / (r ** 5)
    
    a_j2 = np.array([
        factor * r_vec[0] * (1.0 - 5.0 * z2_r2),
        factor * r_vec[1] * (1.0 - 5.0 * z2_r2),
        factor * r_vec[2] * (3.0 - 5.0 * z2_r2)
    ], dtype=np.float64)
    
    return a_grav + a_j2


def propagate_rk4(
    r_vec: np.ndarray, v_vec: np.ndarray, delta_t: float, 
    include_j2: bool = False, mu: float = MU_EARTH
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Classical 4th-Order Runge-Kutta numerical integrator for orbital motion.
    """
    # k1
    a1 = compute_acceleration(r_vec, include_j2, mu)
    k1_v = a1
    k1_r = v_vec
    
    # k2
    r2 = r_vec + 0.5 * delta_t * k1_r
    v2 = v_vec + 0.5 * delta_t * k1_v
    a2 = compute_acceleration(r2, include_j2, mu)
    k2_v = a2
    k2_r = v2
    
    # k3
    r3 = r_vec + 0.5 * delta_t * k2_r
    v3 = v_vec + 0.5 * delta_t * k2_v
    a3 = compute_acceleration(r3, include_j2, mu)
    k3_v = a3
    k3_r = v3
    
    # k4
    r4 = r_vec + delta_t * k3_r
    v4 = v_vec + delta_t * k3_v
    a4 = compute_acceleration(r4, include_j2, mu)
    k4_v = a4
    k4_r = v4
    
    # State update
    r_next = r_vec + (delta_t / 6.0) * (k1_r + 2.0 * k2_r + 2.0 * k3_r + k4_r)
    v_next = v_vec + (delta_t / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v)
    return r_next, v_next

