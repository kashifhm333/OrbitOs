import math
import numpy as np
from datetime import datetime, timezone
from app.ground.coordinates import geodetic_to_ecef, ecef_to_sez, calculate_az_el_range, compute_fspl_db
from app.ground.passes import check_satellite_contact, predict_contact_windows, DEFAULT_GROUND_STATIONS
from app.astrodynamics.constants import R_EARTH

def test_geodetic_to_ecef_equator():
    """Tests geodetic to ECEF conversion at equator prime meridian (lat 0, lon 0)."""
    r_ecef = geodetic_to_ecef(lat_deg=0.0, lon_deg=0.0, alt_m=0.0)
    assert abs(r_ecef[0] - R_EARTH) < 1.0
    assert abs(r_ecef[1]) < 1.0
    assert abs(r_ecef[2]) < 1.0

def test_zenith_pass_elevation():
    """TC-GND-001: Zenith Pass elevation reaches ~90 deg when satellite is directly overhead."""
    lat, lon, alt = 1.3521, 103.8198, 30.0
    r_gs = geodetic_to_ecef(lat, lon, alt)
    
    # Satellite placed directly 500 km vertically above the station
    r_sat = geodetic_to_ecef(lat, lon, alt + 500000.0)
    az, el, slant_range = calculate_az_el_range(r_sat, r_gs, lat, lon)
    
    assert el > 89.9
    assert abs(slant_range - 500000.0) < 10.0

def test_fspl_calculation():
    """Tests Free Space Path Loss calculation for S-band 2.2 GHz."""
    # At 500 km (zenith)
    fspl = compute_fspl_db(500000.0, freq_hz=2.2e9)
    # Expected FSPL is approx 153.3 dB
    assert 150.0 < fspl < 160.0

def test_predict_contact_windows():
    """TC-GND-002: Predicts valid contact windows for an orbit over 12 hours."""
    # Sun-synchronous orbit
    orbit = {
        "semi_major_axis_m": 6878137.0,
        "eccentricity": 0.001,
        "inclination_deg": 97.4,
        "raan_deg": 0.0,
        "arg_periapsis_deg": 0.0,
        "true_anomaly_deg": 0.0
    }
    epoch = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
    passes = predict_contact_windows(orbit, epoch, horizon_hours=12.0, step_seconds=60.0)
    
    # In 12 hours (~8 orbits), a polar/SSO orbit should have multiple passes over high-latitude stations like Svalbard
    assert len(passes) > 0
    for p in passes:
        assert p["max_elevation_deg"] >= 5.0
        assert p["duration_seconds"] > 0
        assert p["los_epoch"] >= p["aos_epoch"]

