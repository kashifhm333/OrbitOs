import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from scipy.optimize import minimize_scalar

from app.astrodynamics.constants import MU_EARTH
from app.astrodynamics.propagator import propagate_orbit_keplerian

class ConjunctionScreener:
    """
    3-Tier Conjunction Screening Pipeline:
    Tier 1: Apogee/Perigee Altitude Envelope Filter O(1)
    Tier 2: Coarse Time-Mesh Sampling (e.g. dt = 60s)
    Tier 3: Fine TCA Minimization via Brent's method on r_rel · v_rel
    """

    def __init__(self, filter_threshold_km: float = 50.0):
        self.filter_threshold_m = filter_threshold_km * 1000.0

    @staticmethod
    def classify_risk(miss_distance_m: float) -> str:
        """Assigns standardized operational risk category."""
        if miss_distance_m >= 10000.0:
            return "INFO"
        elif miss_distance_m >= 5000.0:
            return "WATCH"
        elif miss_distance_m >= 1000.0:
            return "WARNING"
        else:
            return "CRITICAL"

    @staticmethod
    def tier1_altitude_filter(
        kepler_a: Dict[str, float],
        kepler_b: Dict[str, float],
        d_thresh_m: float = 50000.0
    ) -> bool:
        """
        O(1) geometric check: determines whether orbital altitude envelopes overlap within d_thresh.
        Returns True if pair passes filter (potential conjunction), False otherwise.
        """
        a_a = kepler_a["semi_major_axis_m"]
        e_a = kepler_a["eccentricity"]
        rp_a = a_a * (1.0 - e_a)
        ra_a = a_a * (1.0 + e_a)

        a_b = kepler_b["semi_major_axis_m"]
        e_b = kepler_b["eccentricity"]
        rp_b = a_b * (1.0 - e_b)
        ra_b = a_b * (1.0 + e_b)

        # Overlap condition: max(rp_a, rp_b) - d_thresh <= min(ra_a, ra_b) + d_thresh
        if max(rp_a, rp_b) - d_thresh_m > min(ra_a, ra_b) + d_thresh_m:
            return False
        return True

    def screen_pair(
        self,
        primary_id: str,
        primary_name: str,
        primary_kepler: Dict[str, float],
        secondary_id: str,
        secondary_name: str,
        secondary_kepler: Dict[str, float],
        start_epoch: datetime,
        horizon_hours: float = 24.0,
        step_coarse_s: float = 60.0
    ) -> Optional[Dict[str, Any]]:
        """
        Screens a primary satellite against a secondary space object over horizon H.
        """
        # Tier 1 Filter
        if not self.tier1_altitude_filter(primary_kepler, secondary_kepler, self.filter_threshold_m):
            return None

        # Tier 2: Coarse Time-Mesh Sampling
        total_seconds = horizon_hours * 3600.0
        steps = int(total_seconds / step_coarse_s)

        min_sample_dist = float("inf")
        candidate_t = 0.0

        for i in range(steps + 1):
            t_sec = i * step_coarse_s
            r_a, _ = propagate_orbit_keplerian(primary_kepler, t_sec)
            r_b, _ = propagate_orbit_keplerian(secondary_kepler, t_sec)
            
            dist = float(np.linalg.norm(r_b - r_a))
            if dist < min_sample_dist:
                min_sample_dist = dist
                candidate_t = t_sec

        # If closest coarse point exceeds threshold, skip
        if min_sample_dist > self.filter_threshold_m:
            return None

        # Tier 3: Fine TCA Root-Finding / Distance Minimization
        t_low = max(0.0, candidate_t - step_coarse_s)
        t_high = min(total_seconds, candidate_t + step_coarse_s)

        def separation_at_t(t_val: float) -> float:
            r1, _ = propagate_orbit_keplerian(primary_kepler, t_val)
            r2, _ = propagate_orbit_keplerian(secondary_kepler, t_val)
            return float(np.linalg.norm(r2 - r1))

        res = minimize_scalar(
            separation_at_t,
            bounds=(t_low, t_high),
            method="bounded",
            options={"xatol": 0.001}  # 1 millisecond tolerance
        )

        t_tca_seconds = float(res.x)
        r_a_tca, v_a_tca = propagate_orbit_keplerian(primary_kepler, t_tca_seconds)
        r_b_tca, v_b_tca = propagate_orbit_keplerian(secondary_kepler, t_tca_seconds)

        miss_dist_m = float(np.linalg.norm(r_b_tca - r_a_tca))
        rel_vel_mps = float(np.linalg.norm(v_b_tca - v_a_tca))
        tca_epoch = start_epoch + timedelta(seconds=t_tca_seconds)
        risk = self.classify_risk(miss_dist_m)

        return {
            "primary_satellite_id": primary_id,
            "primary_satellite_name": primary_name,
            "secondary_object_id": secondary_id,
            "secondary_object_name": secondary_name,
            "tca_epoch": tca_epoch,
            "time_to_tca_seconds": round(t_tca_seconds, 2),
            "miss_distance_m": round(miss_dist_m, 2),
            "rel_velocity_mps": round(rel_vel_mps, 2),
            "risk_level": risk,
            "status": "DETECTED",
            "primary_r_eci_m": r_a_tca.tolist(),
            "secondary_r_eci_m": r_b_tca.tolist()
        }

