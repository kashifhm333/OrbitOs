import math
import numpy as np
from datetime import datetime, timezone
from typing import Tuple
from app.astrodynamics.constants import OMEGA_EARTH, R_EARTH

def earth_rotation_angle(epoch_dt: datetime) -> float:
    """
    Computes Earth Rotation Angle (ERA) theta_ERA in radians for a given UTC timestamp.
    Uses standard IAU 2000 model referenced to J2000.0 epoch (2000-01-01 12:00:00 UTC).
    """
    j2000_epoch = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    delta_seconds = (epoch_dt - j2000_epoch).total_seconds()
    
    # Base angle at J2000.0 is 0.7790572732640 rad + Earth rotation rate
    theta = (0.7790572732640 + OMEGA_EARTH * delta_seconds) % (2.0 * math.pi)
    if theta < 0:
        theta += 2.0 * math.pi
    return theta


def eci_to_ecef(r_eci: np.ndarray, theta_era: float) -> np.ndarray:
    """
    Transforms a position vector from ECI (J2000) to ECEF (WGS84)
    using the Earth Rotation Angle rotation matrix R_z(theta_ERA).
    """
    cos_t = math.cos(theta_era)
    sin_t = math.sin(theta_era)
    
    r_ecef = np.array([
        cos_t * r_eci[0] + sin_t * r_eci[1],
        -sin_t * r_eci[0] + cos_t * r_eci[1],
        r_eci[2]
    ], dtype=np.float64)
    return r_ecef


def ecef_to_geodetic(r_ecef: np.ndarray) -> Tuple[float, float, float]:
    """
    Converts ECEF Cartesian coordinates to geodetic latitude (deg),
    longitude (deg), and altitude (meters) using Bowring's method for WGS84.
    """
    x, y, z = float(r_ecef[0]), float(r_ecef[1]), float(r_ecef[2])
    
    # WGS84 ellipsoid parameters
    a = R_EARTH
    f = 1.0 / 298.257223563
    e2 = 2.0 * f - f ** 2
    b = a * (1.0 - f)
    e_prime2 = (a ** 2 - b ** 2) / (b ** 2)
    
    p = math.sqrt(x ** 2 + y ** 2)
    
    # Longitude
    longitude_rad = math.atan2(y, x)
    
    # Bowring's closed-form latitude approximation
    theta = math.atan2(z * a, p * b)
    lat_rad = math.atan2(
        z + e_prime2 * b * (math.sin(theta) ** 3),
        p - e2 * a * (math.cos(theta) ** 3)
    )
    
    n = a / math.sqrt(1.0 - e2 * (math.sin(lat_rad) ** 2))
    altitude_m = p / math.cos(lat_rad) - n
    
    lat_deg = math.degrees(lat_rad)
    lon_deg = math.degrees(longitude_rad)
    return lat_deg, lon_deg, altitude_m

