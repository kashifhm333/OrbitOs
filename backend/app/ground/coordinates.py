import math
import numpy as np
from typing import Tuple
from app.astrodynamics.constants import R_EARTH, SPEED_OF_LIGHT

# WGS84 Ellipsoid constants
WGS84_A = R_EARTH  # 6378137.0 m
WGS84_F = 1.0 / 298.257223563
WGS84_E2 = 2.0 * WGS84_F - WGS84_F ** 2

def geodetic_to_ecef(lat_deg: float, lon_deg: float, alt_m: float) -> np.ndarray:
    """
    Converts WGS84 Geodetic coordinates (lat, lon, altitude) to ECEF Cartesian coordinates (m).
    """
    phi = math.radians(lat_deg)
    lam = math.radians(lon_deg)
    
    n_phi = WGS84_A / math.sqrt(1.0 - WGS84_E2 * (math.sin(phi) ** 2))
    
    x = (n_phi + alt_m) * math.cos(phi) * math.cos(lam)
    y = (n_phi + alt_m) * math.cos(phi) * math.sin(lam)
    z = (n_phi * (1.0 - WGS84_E2) + alt_m) * math.sin(phi)
    
    return np.array([x, y, z], dtype=np.float64)

def ecef_to_sez(r_sat_ecef: np.ndarray, r_gs_ecef: np.ndarray, lat_deg: float, lon_deg: float) -> np.ndarray:
    """
    Transforms relative slant vector from ECEF into topocentric South-East-Zenith (SEZ) frame.
    """
    phi = math.radians(lat_deg)
    lam = math.radians(lon_deg)
    
    delta = r_sat_ecef - r_gs_ecef
    
    sin_phi = math.sin(phi)
    cos_phi = math.cos(phi)
    sin_lam = math.sin(lam)
    cos_lam = math.cos(lam)
    
    # SEZ rotation matrix
    r_sez = np.array([
        sin_phi * cos_lam * delta[0] + sin_phi * sin_lam * delta[1] - cos_phi * delta[2],
        -sin_lam * delta[0] + cos_lam * delta[1],
        cos_phi * cos_lam * delta[0] + cos_phi * sin_lam * delta[1] + sin_phi * delta[2]
    ], dtype=np.float64)
    
    return r_sez

def calculate_az_el_range(r_sat_ecef: np.ndarray, r_gs_ecef: np.ndarray, lat_deg: float, lon_deg: float) -> Tuple[float, float, float]:
    """
    Calculates azimuth (deg), elevation (deg), and slant range (meters).
    Elevation mask comparison is done in degrees.
    """
    sez = ecef_to_sez(r_sat_ecef, r_gs_ecef, lat_deg, lon_deg)
    s, e, z = sez[0], sez[1], sez[2]
    
    slant_range_m = float(np.linalg.norm(sez))
    if slant_range_m < 1e-3:
        return 0.0, 90.0, 0.0
    
    # Elevation angle (-90 to +90 deg)
    sin_el = max(-1.0, min(1.0, z / slant_range_m))
    elevation_deg = math.degrees(math.asin(sin_el))
    
    # Azimuth angle (0 to 360 deg, measured clockwise from North)
    # in SEZ: S is South (180 deg), -S is North (0 deg), E is East (90 deg)
    az_rad = math.atan2(e, -s)
    az_deg = (math.degrees(az_rad) + 360.0) % 360.0
    
    return az_deg, elevation_deg, slant_range_m

def compute_fspl_db(slant_range_m: float, freq_hz: float = 2.2e9) -> float:
    """
    Calculates Free-Space Path Loss (FSPL) in decibels for given distance and carrier frequency.
    """
    if slant_range_m <= 0:
        return 0.0
    factor = (4.0 * math.pi * slant_range_m * freq_hz) / SPEED_OF_LIGHT
    return 20.0 * math.log10(factor)

