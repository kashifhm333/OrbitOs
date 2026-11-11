import math
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from app.astrodynamics.constants import MU_EARTH
from app.astrodynamics.kepler_solver import solve_kepler, true_anomaly_from_eccentric
from app.astrodynamics.converters import cartesian_to_keplerian

def parse_tle(tle_text: str, satellite_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses standard NORAD Two-Line Element (TLE) format into orbital state and elements.
    Supports 2-line or 3-line format (with name as line 0).
    """
    lines = [line.strip() for line in tle_text.strip().splitlines() if line.strip()]
    if len(lines) == 3:
        name = lines[0]
        line1 = lines[1]
        line2 = lines[2]
    elif len(lines) == 2:
        name = satellite_name or "IMPORTED_OBJECT"
        line1 = lines[0]
        line2 = lines[1]
    else:
        raise ValueError("Invalid TLE format: Expected 2 or 3 lines of text.")

    if not line1.startswith("1") or not line2.startswith("2"):
        raise ValueError("Invalid TLE header: Line 1 must begin with '1' and Line 2 with '2'.")

    # Line 1 extraction
    sat_number = line1[2:7].strip()
    classification = line1[7] if len(line1) > 7 else "U"
    intl_desig = line1[9:17].strip() if len(line1) > 17 else "00000A"
    
    epoch_yr_short = int(line1[18:20])
    epoch_year = 2000 + epoch_yr_short if epoch_yr_short < 57 else 1900 + epoch_yr_short
    epoch_days = float(line1[20:32])
    
    # Calculate epoch timestamp
    epoch_start = datetime(epoch_year, 1, 1, tzinfo=timezone.utc)
    epoch_dt = epoch_start + timedelta(days=epoch_days - 1.0)

    # Line 2 extraction
    i_deg = float(line2[8:16])
    raan_deg = float(line2[17:25])
    e_str = "0." + line2[26:33].strip().replace(" ", "0")
    e = float(e_str)
    omega_deg = float(line2[34:42])
    m_deg = float(line2[43:51])
    n_revs_per_day = float(line2[52:63])

    # Convert Mean Motion (revs / day) to semi-major axis (meters)
    # n in rad/s:
    n_rad_s = n_revs_per_day * (2.0 * math.pi) / 86400.0
    a_m = float((MU_EARTH / (n_rad_s ** 2)) ** (1.0 / 3.0))

    # Calculate true anomaly from Mean Anomaly
    m_rad = math.radians(m_deg)
    ecc_anomaly = solve_kepler(m_rad, e)
    nu_rad = true_anomaly_from_eccentric(ecc_anomaly, e)

    return {
        "satellite_id": f"SAT-{sat_number}",
        "name": name,
        "sat_number": sat_number,
        "classification": classification,
        "international_designator": intl_desig,
        "epoch": epoch_dt.isoformat(),
        "semi_major_axis_m": round(a_m, 2),
        "eccentricity": round(e, 7),
        "inclination_deg": round(i_deg, 4),
        "inclination_rad": round(math.radians(i_deg), 6),
        "raan_deg": round(raan_deg, 4),
        "raan_rad": round(math.radians(raan_deg), 6),
        "arg_periapsis_deg": round(omega_deg, 4),
        "arg_periapsis_rad": round(math.radians(omega_deg), 6),
        "mean_anomaly_deg": round(m_deg, 4),
        "true_anomaly_deg": round(math.degrees(nu_rad), 4),
        "true_anomaly_rad": round(nu_rad, 6),
        "mean_motion_revs_per_day": n_revs_per_day,
        "orbital_period_minutes": round((2.0 * math.pi / n_rad_s) / 60.0, 2)
    }


def parse_ccsds_oem(oem_text: str) -> Dict[str, Any]:
    """
    Parses standard CCSDS Orbit Ephemeris Message (OEM) in KVN format.
    Extracts metadata headers and trajectory state ephemeris vectors (X, Y, Z, Vx, Vy, Vz).
    """
    metadata: Dict[str, str] = {}
    ephemeris_points: List[Dict[str, Any]] = []

    lines = oem_text.strip().splitlines()
    in_data_block = False

    for line in lines:
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("COMMENT"):
            continue

        if "=" in line_clean and not in_data_block:
            parts = line_clean.split("=", 1)
            key = parts[0].strip().upper()
            val = parts[1].strip()
            metadata[key] = val
            if key == "META_STOP":
                in_data_block = True
            continue

        if line_clean.upper() == "META_STOP":
            in_data_block = True
            continue

        # Data line format: EPOCH X Y Z X_DOT Y_DOT Z_DOT
        tokens = line_clean.split()
        if len(tokens) >= 7:
            epoch_str = tokens[0]
            try:
                # Standard CCSDS OEM is in km and km/s; convert to SI meters and m/s
                x_km = float(tokens[1])
                y_km = float(tokens[2])
                z_km = float(tokens[3])
                vx_kms = float(tokens[4])
                vy_kms = float(tokens[5])
                vz_kms = float(tokens[6])

                pos_m = [x_km * 1000.0, y_km * 1000.0, z_km * 1000.0]
                vel_mps = [vx_kms * 1000.0, vy_kms * 1000.0, vz_kms * 1000.0]

                ephemeris_points.append({
                    "epoch": epoch_str,
                    "position_eci_m": pos_m,
                    "velocity_eci_mps": vel_mps
                })
            except ValueError:
                continue

    if not ephemeris_points:
        raise ValueError("Invalid CCSDS OEM: No valid ephemeris state records found.")

    # Calculate initial osculating orbital elements from first ephemeris state
    first_pt = ephemeris_points[0]
    r_vec = np.array(first_pt["position_eci_m"], dtype=np.float64)
    v_vec = np.array(first_pt["velocity_eci_mps"], dtype=np.float64)
    a, e, i, Omega, omega, nu = cartesian_to_keplerian(r_vec, v_vec)

    return {
        "format": "CCSDS_OEM",
        "object_name": metadata.get("OBJECT_NAME", "OEM_IMPORTED_OBJECT"),
        "object_id": metadata.get("OBJECT_ID", "OEM-001"),
        "center_name": metadata.get("CENTER_NAME", "EARTH"),
        "reference_frame": metadata.get("REF_FRAME", "EME2000"),
        "time_system": metadata.get("TIME_SYSTEM", "UTC"),
        "ephemeris_count": len(ephemeris_points),
        "initial_keplerian": {
            "semi_major_axis_m": round(float(a), 2),
            "eccentricity": round(float(e), 6),
            "inclination_deg": round(math.degrees(i), 4),
            "inclination_rad": round(float(i), 6),
            "raan_deg": round(math.degrees(Omega), 4),
            "raan_rad": round(float(Omega), 6),
            "arg_periapsis_deg": round(math.degrees(omega), 4),
            "arg_periapsis_rad": round(float(omega), 6),
            "true_anomaly_deg": round(math.degrees(nu), 4),
            "true_anomaly_rad": round(float(nu), 6)
        },
        "ephemeris": ephemeris_points
    }


def generate_ccsds_cdm(conjunction_alert: Dict[str, Any]) -> str:
    """
    Serializes a conjunction alert into standard CCSDS Conjunction Data Message (CDM) KVN format.
    Follows CCSDS 508.0-B-1 standard.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000")
    tca_epoch = conjunction_alert.get("tca_epoch")
    if isinstance(tca_epoch, datetime):
        tca_str = tca_epoch.strftime("%Y-%m-%dT%H:%M:%S.000")
    else:
        tca_str = str(tca_epoch or now_str)

    miss_dist = conjunction_alert.get("miss_distance_m", 0.0)
    rel_vel_kms = conjunction_alert.get("relative_velocity_kms", conjunction_alert.get("rel_velocity_mps", 0.0) / 1000.0)
    rel_speed_mps = conjunction_alert.get("rel_velocity_mps", rel_vel_kms * 1000.0)
    pc = conjunction_alert.get("collision_probability", 0.0)
    b_plane = conjunction_alert.get("b_plane", {})

    cdm_text = f"""CCSDS_CDM_VERS = 1.0
COMMENT ====================================================================
COMMENT OrbitOS Autonomous Conjunction Assessment Report (CCSDS CDM)
COMMENT Generated by OrbitOS Mission Control Astrodynamics Core
COMMENT Safety Boundary: SAF-BND-001 (Synthetic Simulation Isolation)
COMMENT ====================================================================
CREATION_DATE          = {now_str}
ORIGINATOR             = ORBITOS_FLIGHT_DYNAMICS_SYSTEM
MESSAGE_FOR            = FLIGHT_OPERATIONS_DIRECTOR
MESSAGE_ID             = CDM-{conjunction_alert.get('id', 'ALERT-001')[:8].upper()}

TCA                    = {tca_str}
MISS_DISTANCE          = {miss_dist:.2f} [m]
RELATIVE_SPEED         = {rel_speed_mps:.2f} [m/s]
RELATIVE_VELOCITY_KMS  = {rel_vel_kms:.4f} [km/s]
COLLISION_PROBABILITY  = {pc:.4e}
COLLISION_PROB_METHOD  = FOSTER_AKELLA_ALFRIEND_2D_B_PLANE
SCREENING_THRESHOLD    = 50000.00 [m]
RISK_LEVEL             = {conjunction_alert.get('risk_level', 'CRITICAL')}

// Relative Encounter Frame (B-Plane)
B_PLANE_X              = {b_plane.get('x_m', 0.0):.2f} [m]
B_PLANE_Z              = {b_plane.get('z_m', 0.0):.2f} [m]
B_PLANE_SIGMA_X        = {b_plane.get('sigma_x_m', 20.0):.2f} [m]
B_PLANE_SIGMA_Z        = {b_plane.get('sigma_z_m', 50.0):.2f} [m]
B_PLANE_RHO_XZ         = {b_plane.get('rho_xz', 0.0):.4f}

// Primary Spacecraft
OBJECT                 = OBJECT1
OBJECT_DESIGNATOR      = {conjunction_alert.get('primary_satellite_id', 'SAT-001')}
OBJECT_NAME            = {conjunction_alert.get('primary_satellite_name', 'OrbitOS-Alpha')}
OBJECT_TYPE            = PAYLOAD
OPERATOR_ORGANIZATION  = ORBITOS_FLIGHT_OPS
EPHEMERIS_NAME         = HIGH_PRECISION_RK4_PROPAGATION
COVARIANCE_METHOD      = RIC_GAUSSIAN_ELLIPSOID

// Secondary Space Object
OBJECT                 = OBJECT2
OBJECT_DESIGNATOR      = {conjunction_alert.get('secondary_object_id', 'DEBRIS-001')}
OBJECT_NAME            = {conjunction_alert.get('secondary_object_name', 'Resident Space Debris')}
OBJECT_TYPE            = DEBRIS
OPERATOR_ORGANIZATION  = UNKNOWN_DEBRIS_TRACKING
EPHEMERIS_NAME         = TWO_BODY_KEPLERIAN_PROPAGATION
COVARIANCE_METHOD      = RIC_GAUSSIAN_ELLIPSOID
"""
    return cdm_text
