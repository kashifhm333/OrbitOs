import math

def solve_kepler(mean_anomaly: float, eccentricity: float, tol: float = 1e-12, max_iter: int = 50) -> float:
    """
    Solves Kepler's Equation for Eccentric Anomaly E:
        M = E - e * sin(E)
    using the Newton-Raphson method with initial guess.
    
    Args:
        mean_anomaly: Mean anomaly M in radians
        eccentricity: Orbit eccentricity e (0 <= e < 1)
        tol: Convergence tolerance in radians
        max_iter: Maximum iterations
        
    Returns:
        Eccentric anomaly E in radians
    """
    # Normalize M into [0, 2pi)
    m = mean_anomaly % (2.0 * math.pi)
    if m < 0:
        m += 2.0 * math.pi

    # Initial guess
    if eccentricity < 0.8:
        e_curr = m
    else:
        e_curr = math.pi

    for _ in range(max_iter):
        f = e_curr - eccentricity * math.sin(e_curr) - m
        f_prime = 1.0 - eccentricity * math.cos(e_curr)
        delta = f / f_prime
        e_curr -= delta
        if abs(delta) < tol:
            return e_curr

    return e_curr


def true_anomaly_from_eccentric(eccentric_anomaly: float, eccentricity: float) -> float:
    """
    Calculates True Anomaly nu from Eccentric Anomaly E:
        tan(nu / 2) = sqrt((1 + e) / (1 - e)) * tan(E / 2)
    """
    beta = math.sqrt((1.0 + eccentricity) / (1.0 - eccentricity))
    sin_half_e = math.sin(eccentric_anomaly / 2.0)
    cos_half_e = math.cos(eccentric_anomaly / 2.0)
    
    nu = 2.0 * math.atan2(beta * sin_half_e, cos_half_e)
    if nu < 0:
        nu += 2.0 * math.pi
    return nu


def eccentric_from_true_anomaly(true_anomaly: float, eccentricity: float) -> float:
    """
    Calculates Eccentric Anomaly E from True Anomaly nu:
        tan(E / 2) = sqrt((1 - e) / (1 + e)) * tan(nu / 2)
    """
    factor = math.sqrt((1.0 - eccentricity) / (1.0 + eccentricity))
    sin_half_nu = math.sin(true_anomaly / 2.0)
    cos_half_nu = math.cos(true_anomaly / 2.0)
    
    e = 2.0 * math.atan2(factor * sin_half_nu, cos_half_nu)
    if e < 0:
        e += 2.0 * math.pi
    return e

