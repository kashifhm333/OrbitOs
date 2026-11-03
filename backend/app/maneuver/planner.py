import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from app.astrodynamics.constants import MU_EARTH, G0, ISP_CHEMICAL
from app.astrodynamics.converters import cartesian_to_keplerian, keplerian_to_cartesian
from app.astrodynamics.propagator import propagate_orbit_keplerian

def lvlh_basis_vectors(r_eci: np.ndarray, v_eci: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Computes unit vectors for Radial, In-Track (Transverse), and Cross-Track (Normal) in ECI frame.
    """
    r_norm = np.linalg.norm(r_eci)
    r_hat = r_eci / r_norm
    
    h = np.cross(r_eci, v_eci)
    h_norm = np.linalg.norm(h)
    c_hat = h / h_norm
    
    t_hat = np.cross(c_hat, r_hat)
    return r_hat, t_hat, c_hat

def lvlh_to_eci_deltav(
    delta_v_lvlh: np.ndarray,
    r_eci: np.ndarray,
    v_eci: np.ndarray
) -> np.ndarray:
    """
    Transforms [dv_r, dv_t, dv_c] from LVLH frame to ECI Cartesian coordinates.
    """
    r_hat, t_hat, c_hat = lvlh_basis_vectors(r_eci, v_eci)
    return delta_v_lvlh[0] * r_hat + delta_v_lvlh[1] * t_hat + delta_v_lvlh[2] * c_hat

def calculate_fuel_consumption(wet_mass_kg: float, delta_v_mps: float, isp_s: float = ISP_CHEMICAL) -> float:
    """
    Tsiolkovsky rocket equation: delta_m = m_wet * (1 - exp(-|dv| / (Isp * g0)))
    """
    if delta_v_mps <= 0.0:
        return 0.0
    exponent = -delta_v_mps / (isp_s * G0)
    return float(wet_mass_kg * (1.0 - math.exp(exponent)))

class ManeuverPlanner:
    """
    Autonomous Maneuver Planning and Candidate Generation Engine.
    """

    SAFE_SEPARATION_M = 5000.0  # 5 km safety sphere
    RESERVE_FUEL_KG = 0.5       # 0.5 kg reserve invariant

    @classmethod
    def generate_candidates(
        cls,
        satellite_meta: Dict[str, Any],
        satellite_kepler: Dict[str, float],
        secondary_kepler: Dict[str, float],
        tca_epoch: datetime,
        current_epoch: datetime,
        nominal_dv_mps: float = 1.0
    ) -> List[Dict[str, Any]]:
        """
        Generates 4 canonical candidate strategies:
        1. In-Track Prograde (+dv_t)
        2. In-Track Retrograde (-dv_t)
        3. Cross-Track Normal (+dv_c)
        4. No-Action Baseline
        """
        time_to_tca = (tca_epoch - current_epoch).total_seconds()
        # Schedule burn 30 minutes before TCA, or current epoch if TCA is within 30 min
        burn_lead_seconds = min(1800.0, max(60.0, time_to_tca * 0.5))
        burn_epoch = tca_epoch - timedelta(seconds=burn_lead_seconds)
        t_burn_offset = (burn_epoch - current_epoch).total_seconds()

        dry_mass = satellite_meta["dry_mass_kg"]
        prop_mass = satellite_meta["propellant_mass_kg"]
        wet_mass = dry_mass + prop_mass
        usable_fuel = max(0.0, prop_mass - cls.RESERVE_FUEL_KG)

        # Baseline satellite state at burn epoch
        r_burn_sat, v_burn_sat = propagate_orbit_keplerian(satellite_kepler, t_burn_offset)
        r_hat, t_hat, c_hat = lvlh_basis_vectors(r_burn_sat, v_burn_sat)

        # Secondary state at TCA
        r_tca_sec, _ = propagate_orbit_keplerian(secondary_kepler, time_to_tca)

        strategies = [
            ("IN_TRACK_PROGRADE", np.array([0.0, nominal_dv_mps, 0.0])),
            ("IN_TRACK_RETROGRADE", np.array([0.0, -nominal_dv_mps, 0.0])),
            ("CROSS_TRACK_NORMAL", np.array([0.0, 0.0, nominal_dv_mps * 2.0])),
            ("NO_ACTION", np.array([0.0, 0.0, 0.0]))
        ]

        candidates = []

        for name, dv_lvlh in strategies:
            dv_magnitude = float(np.linalg.norm(dv_lvlh))
            dv_eci = lvlh_to_eci_deltav(dv_lvlh, r_burn_sat, v_burn_sat)
            fuel_needed = calculate_fuel_consumption(wet_mass, dv_magnitude)

            is_feasible = True
            rejection_reason = None

            # Pre-condition fuel check (SPEC-PRE-002)
            if fuel_needed > usable_fuel:
                is_feasible = False
                rejection_reason = f"Required fuel ({fuel_needed:.3f} kg) exceeds available usable margin ({usable_fuel:.3f} kg)"

            # Propagate candidate post-burn state to TCA
            v_post_burn = v_burn_sat + dv_eci
            post_kepler = cartesian_to_keplerian(r_burn_sat, v_post_burn)
            time_from_burn_to_tca = time_to_tca - t_burn_offset
            r_sat_post_tca, _ = propagate_orbit_keplerian(post_kepler, time_from_burn_to_tca)

            projected_miss_m = float(np.linalg.norm(r_tca_sec - r_sat_post_tca))

            # Utility function
            safety_term = min(1.0, projected_miss_m / cls.SAFE_SEPARATION_M)
            dv_penalty = dv_magnitude / 10.0
            utility = (0.60 * safety_term) - (0.30 * dv_penalty)

            candidates.append({
                "id": str(uuid.uuid4()),
                "strategy": name,
                "burn_epoch": burn_epoch,
                "delta_v_lvlh_mps": dv_lvlh.tolist(),
                "delta_v_eci_mps": dv_eci.tolist(),
                "delta_v_total_mps": round(dv_magnitude, 3),
                "required_fuel_kg": round(fuel_needed, 4),
                "projected_miss_distance_m": round(projected_miss_m, 1),
                "utility_score": round(utility, 4),
                "is_feasible": is_feasible,
                "rejection_reason": rejection_reason,
                "status": "CANDIDATE",
                "is_approved": False
            })

        # Rank candidates by utility descending (feasible ones first)
        candidates.sort(key=lambda c: (c["is_feasible"], c["utility_score"]), reverse=True)
        return candidates

