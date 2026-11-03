import numpy as np
from app.astrodynamics.constants import R_EARTH

def check_cylindrical_eclipse(r_eci: np.ndarray, sun_dir_eci: np.ndarray = None) -> bool:
    """
    Determines if satellite at position r_eci is in Earth's cylindrical shadow.
    
    Default sun vector points along +X axis (vernal equinox direction).
    
    Returns:
        True if in eclipse (shadow), False if in sunlight.
    """
    if sun_dir_eci is None:
        sun_dir_eci = np.array([1.0, 0.0, 0.0])
        
    s_unit = sun_dir_eci / np.linalg.norm(sun_dir_eci)
    
    # Projection along Sun-Earth line
    proj = float(np.dot(r_eci, s_unit))
    
    # If satellite is in the sunward hemisphere, it cannot be eclipsed
    if proj >= 0.0:
        return False
        
    # Perpendicular distance to Sun-Earth axis
    perp_dist_sq = float(np.linalg.norm(r_eci) ** 2 - proj ** 2)
    
    # If perpendicular distance is less than Earth radius, satellite is in shadow
    return perp_dist_sq < (R_EARTH ** 2)


def is_in_eclipse(r_eci: np.ndarray, epoch=None) -> bool:
    """Convenience alias for cylindrical shadow check."""
    return check_cylindrical_eclipse(r_eci)

