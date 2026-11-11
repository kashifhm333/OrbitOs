import math
import numpy as np
from typing import Tuple, Dict, Any, Optional
from app.astrodynamics.constants import (
    MU_EARTH, R_EARTH, J2_EARTH, OMEGA_EARTH_RAD_S,
    RHO_0_LEO, H0_LEO, SCALE_HEIGHT_LEO,
    DEFAULT_CD, DEFAULT_AREA_M2, DEFAULT_MASS_KG
)
from app.astrodynamics.kepler_solver import (
    solve_kepler, true_anomaly_from_eccentric, eccentric_from_true_anomaly
)
from app.astrodynamics.converters import keplerian_to_cartesian

def compute_atmospheric_density(altitude_m: float) -> float:
    """
    Computes atmospheric density rho(h) in kg/m^3 using standard exponential model.
    Reference altitude h0 = 500 km, rho0 = 6.967e-13 kg/m^3, H = 63.822 km.
    """
    if altitude_m < 0.0:
        altitude_m = 0.0
    if altitude_m > 1200000.0:  # > 1200 km, atmospheric drag is negligible
        return 0.0
    
    delta_h = altitude_m - H0_LEO
    rho = RHO_0_LEO * math.exp(-delta_h / SCALE_HEIGHT_LEO)
    return float(rho)


def compute_j2_nodal_precession_rate(a: float, e: float, i: float, mu: float = MU_EARTH) -> float:
    """
    Calculates secular nodal regression rate dOmega/dt in rad/s due to Earth J2 oblateness:
    dOmega/dt = -3/2 * J2 * (R_E / p)^2 * n * cos(i)
    where p = a * (1 - e^2), n = sqrt(mu / a^3).
    """
    p = a * (1.0 - (e ** 2))
    if p <= 0.0:
        return 0.0
    n = math.sqrt(mu / (a ** 3))
    factor = -1.5 * J2_EARTH * ((R_EARTH / p) ** 2) * n * math.cos(i)
    return float(factor)


def compute_j2_nodal_precession_deg_per_day(a: float, e: float, i: float, mu: float = MU_EARTH) -> float:
    """
    Returns secular nodal regression rate in degrees per solar day.
    For sun-synchronous OrbitOS-Alpha (a=6878.1 km, i=97.4 deg), returns ~ +0.9856 deg/day.
    """
    d_omega_rad_s = compute_j2_nodal_precession_rate(a, e, i, mu)
    return float(math.degrees(d_omega_rad_s) * 86400.0)


def propagate_keplerian(
    a: float, e: float, i: float, Omega: float, omega: float, nu_0: float, 
    delta_t: float, mu: float = MU_EARTH, include_j2: bool = True
) -> Tuple[float, np.ndarray, np.ndarray]:
    """
    Propagates two-body Keplerian elements forward by delta_t seconds,
    accounting for J2 secular nodal precession when include_j2 is True.
    
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

    # If J2 precession is active, advance RAAN Omega
    current_omega = Omega
    if include_j2:
        d_raan = compute_j2_nodal_precession_rate(a, e, i, mu) * delta_t
        current_omega = (Omega + d_raan) % (2.0 * math.pi)
    
    # Compute Cartesian state
    r_eci, v_eci = keplerian_to_cartesian(a, e, i, current_omega, omega, nu_t, mu=mu)
    return nu_t, r_eci, v_eci


def propagate_orbit_keplerian(
    elements: Any, delta_t: float, mu: float = MU_EARTH, include_j2: bool = True
) -> Tuple[np.ndarray, np.ndarray]:
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
    
    _, r_eci, v_eci = propagate_keplerian(a, e, i, Omega, omega, nu, delta_t, mu=mu, include_j2=include_j2)
    return r_eci, v_eci


def compute_acceleration(
    r_vec: np.ndarray, 
    v_vec: Optional[np.ndarray] = None,
    include_j2: bool = False, 
    include_drag: bool = False,
    cd: float = DEFAULT_CD,
    area_m2: float = DEFAULT_AREA_M2,
    mass_kg: float = DEFAULT_MASS_KG,
    mu: float = MU_EARTH
) -> np.ndarray:
    """
    Computes total acceleration vector:
    a_total = a_grav + a_j2 + a_drag
    """
    r = float(np.linalg.norm(r_vec))
    if r < 1000.0:
        return np.zeros(3, dtype=np.float64)
    r3 = r ** 3
    a_total = -(mu / r3) * r_vec
    
    # 1. J2 Oblateness Perturbation
    if include_j2:
        z2_r2 = (r_vec[2] / r) ** 2
        factor = -(1.5 * J2_EARTH * mu * (R_EARTH ** 2)) / (r ** 5)
        a_j2 = np.array([
            factor * r_vec[0] * (1.0 - 5.0 * z2_r2),
            factor * r_vec[1] * (1.0 - 5.0 * z2_r2),
            factor * r_vec[2] * (3.0 - 5.0 * z2_r2)
        ], dtype=np.float64)
        a_total = a_total + a_j2

    # 2. Atmospheric Drag Perturbation
    if include_drag and v_vec is not None and mass_kg > 0.0:
        altitude_m = r - R_EARTH
        rho = compute_atmospheric_density(altitude_m)
        if rho > 0.0:
            # v_rel = v - omega_earth x r
            omega_vec = np.array([0.0, 0.0, OMEGA_EARTH_RAD_S], dtype=np.float64)
            v_rel = v_vec - np.cross(omega_vec, r_vec)
            v_rel_mag = float(np.linalg.norm(v_rel))
            
            # a_drag = -0.5 * rho * (Cd * A / m) * ||v_rel|| * v_rel
            drag_factor = -0.5 * rho * (cd * area_m2 / mass_kg) * v_rel_mag
            a_drag = drag_factor * v_rel
            a_total = a_total + a_drag
    
    return a_total


def propagate_rk4(
    r_vec: np.ndarray, 
    v_vec: np.ndarray, 
    delta_t: float, 
    include_j2: bool = False, 
    include_drag: bool = False,
    cd: float = DEFAULT_CD,
    area_m2: float = DEFAULT_AREA_M2,
    mass_kg: float = DEFAULT_MASS_KG,
    mu: float = MU_EARTH
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Classical 4th-Order Runge-Kutta numerical integrator for perturbed orbital motion
    accounting for Earth central gravity, J2 oblateness, and exponential atmospheric drag.
    """
    # k1
    a1 = compute_acceleration(r_vec, v_vec, include_j2, include_drag, cd, area_m2, mass_kg, mu)
    k1_v = a1
    k1_r = v_vec
    
    # k2
    r2 = r_vec + 0.5 * delta_t * k1_r
    v2 = v_vec + 0.5 * delta_t * k1_v
    a2 = compute_acceleration(r2, v2, include_j2, include_drag, cd, area_m2, mass_kg, mu)
    k2_v = a2
    k2_r = v2
    
    # k3
    r3 = r_vec + 0.5 * delta_t * k2_r
    v3 = v_vec + 0.5 * delta_t * k2_v
    a3 = compute_acceleration(r3, v3, include_j2, include_drag, cd, area_m2, mass_kg, mu)
    k3_v = a3
    k3_r = v3
    
    # k4
    r4 = r_vec + delta_t * k3_r
    v4 = v_vec + delta_t * k3_v
    a4 = compute_acceleration(r4, v4, include_j2, include_drag, cd, area_m2, mass_kg, mu)
    k4_v = a4
    k4_r = v4
    
    # State update
    r_next = r_vec + (delta_t / 6.0) * (k1_r + 2.0 * k2_r + 2.0 * k3_r + k4_r)
    v_next = v_vec + (delta_t / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v)
    return r_next, v_next

