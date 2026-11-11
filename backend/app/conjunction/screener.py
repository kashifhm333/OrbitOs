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

        # Compute B-plane encounter geometry and 2D Gaussian Pc
        b_plane_res = self.compute_b_plane_and_pc(r_a_tca, v_a_tca, r_b_tca, v_b_tca)

        return {
            "primary_satellite_id": primary_id,
            "primary_satellite_name": primary_name,
            "secondary_object_id": secondary_id,
            "secondary_object_name": secondary_name,
            "tca_epoch": tca_epoch,
            "time_to_tca_seconds": round(t_tca_seconds, 2),
            "miss_distance_m": round(miss_dist_m, 2),
            "rel_velocity_mps": round(rel_vel_mps, 2),
            "relative_velocity_kms": b_plane_res["relative_velocity_kms"],
            "collision_probability": b_plane_res["collision_probability"],
            "b_plane": b_plane_res["b_plane"],
            "risk_level": risk,
            "status": "DETECTED",
            "primary_r_eci_m": r_a_tca.tolist(),
            "secondary_r_eci_m": r_b_tca.tolist()
        }

    @staticmethod
    def compute_b_plane_and_pc(
        r_a: np.ndarray,
        v_a: np.ndarray,
        r_b: np.ndarray,
        v_b: np.ndarray,
        r_hb_m: float = 10.0,
        sigma_ric_primary: Tuple[float, float, float] = (20.0, 250.0, 50.0),
        sigma_ric_secondary: Tuple[float, float, float] = (50.0, 500.0, 100.0)
    ) -> Dict[str, Any]:
        """
        Computes 2D B-plane encounter frame coordinates and 2D Gaussian Collision Probability (Pc).
        Uses NASA standard RIC covariance ellipsoids projected onto the encounter B-plane.
        """
        dr = r_b - r_a
        dv = v_b - v_a
        v_rel = float(np.linalg.norm(dv))
        if v_rel < 1e-4:
            v_rel = 1e-4

        # Primary RIC Unit Vectors
        r_norm = float(np.linalg.norm(r_a))
        r_hat = r_a / (r_norm if r_norm > 0 else 1.0)
        h_vec = np.cross(r_a, v_a)
        h_norm = float(np.linalg.norm(h_vec))
        if h_norm < 1e-4:
            h_vec = np.array([0.0, 0.0, 1.0])
            h_norm = 1.0
        c_hat = h_vec / h_norm
        i_hat = np.cross(c_hat, r_hat)
        i_hat_norm = float(np.linalg.norm(i_hat))
        if i_hat_norm > 0:
            i_hat = i_hat / i_hat_norm

        # Rotation matrix from RIC to ECI
        t_ric_to_eci = np.column_stack([r_hat, i_hat, c_hat])

        # Combined RIC Covariance
        cov_ric = np.diag([
            sigma_ric_primary[0]**2 + sigma_ric_secondary[0]**2,
            sigma_ric_primary[1]**2 + sigma_ric_secondary[1]**2,
            sigma_ric_primary[2]**2 + sigma_ric_secondary[2]**2
        ])
        cov_eci = t_ric_to_eci @ cov_ric @ t_ric_to_eci.T

        # B-Plane Encounter Unit Vectors (y_hat along relative velocity)
        y_hat = dv / v_rel
        cross_yr = np.cross(y_hat, r_hat)
        cross_norm = float(np.linalg.norm(cross_yr))
        if cross_norm < 1e-4:
            cross_yr = np.cross(y_hat, np.array([0.0, 0.0, 1.0]))
            cross_norm = float(np.linalg.norm(cross_yr))
            if cross_norm < 1e-4:
                cross_yr = np.array([1.0, 0.0, 0.0])
                cross_norm = 1.0
        x_hat = cross_yr / cross_norm
        z_hat = np.cross(x_hat, y_hat)
        z_hat_norm = float(np.linalg.norm(z_hat))
        if z_hat_norm > 0:
            z_hat = z_hat / z_hat_norm

        # Projection matrix onto B-plane (2x3)
        m_b = np.vstack([x_hat, z_hat])

        # 2D B-plane relative coordinates
        r_b_plane = m_b @ dr
        x_b, z_b = float(r_b_plane[0]), float(r_b_plane[1])

        # 2D B-plane covariance (2x2)
        sigma_b = m_b @ cov_eci @ m_b.T
        sigma_x2 = max(1.0, float(sigma_b[0, 0]))
        sigma_z2 = max(1.0, float(sigma_b[1, 1]))
        sigma_xz = float(sigma_b[0, 1])

        sigma_x = math.sqrt(sigma_x2)
        sigma_z = math.sqrt(sigma_z2)
        rho_xz = sigma_xz / (sigma_x * sigma_z)
        rho_xz = max(-0.9999, min(0.9999, rho_xz))

        det_b = sigma_x2 * sigma_z2 * (1.0 - rho_xz ** 2)
        inv_b = np.array([
            [sigma_z2, -sigma_xz],
            [-sigma_xz, sigma_x2]
        ]) / det_b

        q = float(r_b_plane.T @ inv_b @ r_b_plane)
        
        # 2D Gaussian integration over hard body circle
        scaling = (r_hb_m ** 2) / (2.0 * sigma_x * sigma_z * math.sqrt(1.0 - rho_xz ** 2))
        exponent = -0.5 * q
        if exponent < -50.0:
            pc = 0.0
        else:
            raw_pc = scaling * math.exp(exponent)
            pc = 1.0 - math.exp(-raw_pc)
            pc = max(0.0, min(1.0, float(pc)))

        return {
            "collision_probability": pc,
            "relative_velocity_kms": round(v_rel / 1000.0, 4),
            "b_plane": {
                "x_m": round(x_b, 2),
                "z_m": round(z_b, 2),
                "sigma_x_m": round(sigma_x, 2),
                "sigma_z_m": round(sigma_z, 2),
                "rho_xz": round(rho_xz, 4)
            }
        }

