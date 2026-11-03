import math
import numpy as np
from typing import Tuple
from app.astrodynamics.constants import MU_EARTH
from app.astrodynamics.kepler_solver import eccentric_from_true_anomaly

def orbital_period(semi_major_axis_m: float, mu: float = MU_EARTH) -> float:
    """Calculates orbital period T = 2 * pi * sqrt(a^3 / mu) in seconds."""
    return 2.0 * math.pi * math.sqrt((semi_major_axis_m ** 3) / mu)


def specific_orbital_energy(r_vec: np.ndarray, v_vec: np.ndarray, mu: float = MU_EARTH) -> float:
    """Calculates specific orbital energy E = v^2 / 2 - mu / r in J / kg."""
    r = np.linalg.norm(r_vec)
    v = np.linalg.norm(v_vec)
    return (v ** 2) / 2.0 - mu / r


def specific_angular_momentum(r_vec: np.ndarray, v_vec: np.ndarray) -> np.ndarray:
    """Calculates specific angular momentum vector h = r x v in m^2 / s."""
    return np.cross(r_vec, v_vec)


def keplerian_to_cartesian(
    a: float, e: float, i: float, Omega: float, omega: float, nu: float, mu: float = MU_EARTH
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Converts classical Keplerian orbital elements to ECI Cartesian position and velocity vectors.
    
    Args:
        a: Semi-major axis (m)
        e: Eccentricity (0 <= e < 1)
        i: Inclination (rad)
        Omega: Right Ascension of Ascending Node RAAN (rad)
        omega: Argument of periapsis (rad)
        nu: True anomaly (rad)
        mu: Gravitational parameter (m^3/s^2)
        
    Returns:
        Tuple of (position_eci_m, velocity_eci_mps) as 3D numpy arrays
    """
    p = a * (1.0 - e ** 2)
    r_norm = p / (1.0 + e * math.cos(nu))
    
    # State in perifocal frame (PQW)
    r_pqw = np.array([
        r_norm * math.cos(nu),
        r_norm * math.sin(nu),
        0.0
    ], dtype=np.float64)
    
    sqrt_mu_p = math.sqrt(mu / p)
    v_pqw = np.array([
        -sqrt_mu_p * math.sin(nu),
        sqrt_mu_p * (e + math.cos(nu)),
        0.0
    ], dtype=np.float64)
    
    # Rotation matrix from PQW to ECI
    # R = R_z(-Omega) * R_x(-i) * R_z(-omega)
    cos_O = math.cos(Omega)
    sin_O = math.sin(Omega)
    cos_i = math.cos(i)
    sin_i = math.sin(i)
    cos_w = math.cos(omega)
    sin_w = math.sin(omega)
    
    R = np.array([
        [
            cos_O * cos_w - sin_O * sin_w * cos_i,
            -cos_O * sin_w - sin_O * cos_w * cos_i,
            sin_O * sin_i
        ],
        [
            sin_O * cos_w + cos_O * sin_w * cos_i,
            -sin_O * sin_w + cos_O * cos_w * cos_i,
            -cos_O * sin_i
        ],
        [
            sin_w * sin_i,
            cos_w * sin_i,
            cos_i
        ]
    ], dtype=np.float64)
    
    r_eci = R @ r_pqw
    v_eci = R @ v_pqw
    return r_eci, v_eci


def cartesian_to_keplerian(
    r_vec: np.ndarray, v_vec: np.ndarray, mu: float = MU_EARTH
) -> Tuple[float, float, float, float, float, float]:
    """
    Converts ECI Cartesian position and velocity vectors into Keplerian elements.
    
    Returns:
        (a, e, i, Omega, omega, nu) with angles in radians, a in meters
    """
    r = np.linalg.norm(r_vec)
    v = np.linalg.norm(v_vec)
    
    # Angular momentum
    h_vec = np.cross(r_vec, v_vec)
    h = np.linalg.norm(h_vec)
    
    # Node vector
    k_unit = np.array([0.0, 0.0, 1.0])
    n_vec = np.cross(k_unit, h_vec)
    n = np.linalg.norm(n_vec)
    
    # Eccentricity vector
    e_vec = ((v ** 2 - mu / r) * r_vec - np.dot(r_vec, v_vec) * v_vec) / mu
    e = float(np.linalg.norm(e_vec))
    
    # Specific mechanical energy & semi-major axis
    energy = (v ** 2) / 2.0 - mu / r
    if abs(energy) > 1e-12:
        a = -mu / (2.0 * energy)
    else:
        a = float("inf")
        
    # Inclination
    i = math.acos(np.clip(h_vec[2] / h, -1.0, 1.0))
    
    # RAAN (Omega)
    if n > 1e-10:
        Omega = math.acos(np.clip(n_vec[0] / n, -1.0, 1.0))
        if n_vec[1] < 0:
            Omega = 2.0 * math.pi - Omega
    else:
        Omega = 0.0
        
    # Argument of periapsis (omega)
    if n > 1e-10 and e > 1e-10:
        omega = math.acos(np.clip(np.dot(n_vec, e_vec) / (n * e), -1.0, 1.0))
        if e_vec[2] < 0:
            omega = 2.0 * math.pi - omega
    else:
        omega = 0.0
        
    # True anomaly (nu)
    if e > 1e-10:
        cos_nu = np.clip(np.dot(e_vec, r_vec) / (e * r), -1.0, 1.0)
        nu = math.acos(cos_nu)
        if np.dot(r_vec, v_vec) < 0:
            nu = 2.0 * math.pi - nu
    else:
        nu = 0.0
        
    return float(a), float(e), float(i), float(Omega), float(omega), float(nu)

