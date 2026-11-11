import asyncio
import sys
import argparse
from datetime import datetime, timezone, timedelta
import math
import numpy as np

from sqlalchemy import select
from app.models.database import AsyncSessionLocal, init_db
from app.models.entities import (
    SimulationRun, Satellite, OrbitalState, SatelliteTelemetry,
    GroundStation, ConjunctionEvent, AlertRecord
)
from app.astrodynamics.constants import MU_EARTH, R_EARTH
from app.astrodynamics.converters import keplerian_to_cartesian

async def seed_demo():
    """
    Idempotently seeds orbitos.db with:
    - 4 Core Satellites (OrbitOS-Alpha, Beta, Gamma, Pioneer-X)
    - 5 Global Ground Stations (including Svalbard Satellite Station)
    - Cosmos 2251 Fragment #4812 resident debris
    - 2 Pre-computed conjunction warnings
    """
    print("=" * 66)
    print("  ORBITOS ASTRODYNAMICS DEMO DATA SEEDER")
    print("=" * 66)

    # Ensure schema exists
    await init_db()

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            # 1. Ensure Simulation Run exists
            sim_stmt = select(SimulationRun).where(SimulationRun.id == "sim-run-default")
            sim_res = await session.execute(sim_stmt)
            sim_run = sim_res.scalar_one_or_none()

            if not sim_run:
                sim_run = SimulationRun(
                    id="sim-run-default",
                    scenario_name="OrbitOS Operational Mission Run",
                    random_seed=42,
                    start_epoch=now,
                    current_epoch=now,
                    tick_size_seconds=1.0,
                    clock_state="READY",
                    time_acceleration=1.0
                )
                session.add(sim_run)
                await session.flush()
                print("  ✓ Created default SimulationRun (sim-run-default)")

            # 2. Seed 4 Core Satellites
            core_satellites = [
                {
                    "id": "sat-001",
                    "name": "OrbitOS-Alpha (Sun-Sync)",
                    "norad_id": 99001,
                    "dry_mass_kg": 150.0,
                    "propellant_mass_kg": 15.0,
                    "operational_state": "ACTIVE",
                    "a_m": 6878137.0,
                    "e": 0.001,
                    "i_rad": math.radians(97.4),
                    "raan_rad": 0.0,
                    "omega_rad": 0.0,
                    "nu_rad": 0.0,
                    "battery_soc_pct": 98.0
                },
                {
                    "id": "sat-002",
                    "name": "OrbitOS-Beta (Molniya)",
                    "norad_id": 99002,
                    "dry_mass_kg": 200.0,
                    "propellant_mass_kg": 25.0,
                    "operational_state": "ACTIVE",
                    "a_m": 26600000.0,
                    "e": 0.74,
                    "i_rad": math.radians(63.4),
                    "raan_rad": math.radians(45.0),
                    "omega_rad": math.radians(270.0),
                    "nu_rad": 0.0,
                    "battery_soc_pct": 92.0
                },
                {
                    "id": "sat-003",
                    "name": "OrbitOS-Gamma (Polar)",
                    "norad_id": 99003,
                    "dry_mass_kg": 180.0,
                    "propellant_mass_kg": 20.0,
                    "operational_state": "ACTIVE",
                    "a_m": 6978137.0,
                    "e": 0.001,
                    "i_rad": math.radians(90.0),
                    "raan_rad": math.radians(90.0),
                    "omega_rad": 0.0,
                    "nu_rad": math.radians(45.0),
                    "battery_soc_pct": 88.0
                },
                {
                    "id": "sat-004",
                    "name": "OrbitOS-Pioneer-X",
                    "norad_id": 99004,
                    "dry_mass_kg": 150.0,
                    "propellant_mass_kg": 15.0,
                    "operational_state": "ACTIVE",
                    "a_m": 7028137.0,
                    "e": 0.0008,
                    "i_rad": math.radians(51.6),
                    "raan_rad": math.radians(120.0),
                    "omega_rad": math.radians(30.0),
                    "nu_rad": 0.0,
                    "battery_soc_pct": 100.0
                }
            ]

            for s_data in core_satellites:
                sat_stmt = select(Satellite).where(Satellite.id == s_data["id"])
                existing_sat = (await session.execute(sat_stmt)).scalar_one_or_none()

                if not existing_sat:
                    sat_obj = Satellite(
                        id=s_data["id"],
                        simulation_run_id=sim_run.id,
                        name=s_data["name"],
                        norad_id=s_data["norad_id"],
                        dry_mass_kg=s_data["dry_mass_kg"],
                        propellant_mass_kg=s_data["propellant_mass_kg"],
                        operational_state=s_data["operational_state"],
                        is_synthetic=True
                    )
                    session.add(sat_obj)
                    await session.flush()

                    # Compute Cartesian state
                    r_eci, v_eci = keplerian_to_cartesian(
                        s_data["a_m"], s_data["e"], s_data["i_rad"],
                        s_data["raan_rad"], s_data["omega_rad"], s_data["nu_rad"]
                    )

                    # Add orbital state
                    orb_state = OrbitalState(
                        satellite_id=s_data["id"],
                        epoch=now,
                        pos_x_m=float(r_eci[0]),
                        pos_y_m=float(r_eci[1]),
                        pos_z_m=float(r_eci[2]),
                        vel_x_mps=float(v_eci[0]),
                        vel_y_mps=float(v_eci[1]),
                        vel_z_mps=float(v_eci[2]),
                        semi_major_axis_m=s_data["a_m"],
                        eccentricity=s_data["e"],
                        inclination_rad=s_data["i_rad"],
                        raan_rad=s_data["raan_rad"],
                        arg_periapsis_rad=s_data["omega_rad"],
                        true_anomaly_rad=s_data["nu_rad"]
                    )
                    session.add(orb_state)

                    # Add baseline telemetry record
                    tel_record = SatelliteTelemetry(
                        satellite_id=s_data["id"],
                        epoch=now,
                        battery_soc_pct=s_data["battery_soc_pct"],
                        bus_voltage_v=28.2,
                        bus_current_a=3.6,
                        battery_temp_c=19.8,
                        solar_power_w=240.0,
                        in_eclipse=False,
                        subsystem_status="NOMINAL",
                        is_synthetic=True
                    )
                    session.add(tel_record)

            print(f"  ✓ Verified/Seeded 4 core satellites into constellation fleet")

            # 3. Seed 5 Global Ground Stations (including Svalbard)
            ground_stations = [
                {
                    "id": "gs-svalbard",
                    "name": "Svalbard Satellite Station (SvalSat)",
                    "latitude_deg": 78.23,
                    "longitude_deg": 15.39,
                    "altitude_m": 400.0,
                    "min_elevation_deg": 5.0
                },
                {
                    "id": "gs-goldstone",
                    "name": "Goldstone Deep Space Complex",
                    "latitude_deg": 35.43,
                    "longitude_deg": -116.89,
                    "altitude_m": 1000.0,
                    "min_elevation_deg": 10.0
                },
                {
                    "id": "gs-madrid",
                    "name": "Madrid Deep Space Complex",
                    "latitude_deg": 40.43,
                    "longitude_deg": -4.25,
                    "altitude_m": 800.0,
                    "min_elevation_deg": 10.0
                },
                {
                    "id": "gs-canberra",
                    "name": "Canberra Deep Space Complex",
                    "latitude_deg": -35.40,
                    "longitude_deg": 148.98,
                    "altitude_m": 650.0,
                    "min_elevation_deg": 10.0
                },
                {
                    "id": "gs-kiruna",
                    "name": "Kiruna Station (ESRANGE)",
                    "latitude_deg": 67.86,
                    "longitude_deg": 20.96,
                    "altitude_m": 350.0,
                    "min_elevation_deg": 5.0
                }
            ]

            for gs in ground_stations:
                gs_stmt = select(GroundStation).where(GroundStation.id == gs["id"])
                existing_gs = (await session.execute(gs_stmt)).scalar_one_or_none()
                if not existing_gs:
                    session.add(GroundStation(
                        id=gs["id"],
                        name=gs["name"],
                        latitude_deg=gs["latitude_deg"],
                        longitude_deg=gs["longitude_deg"],
                        altitude_m=gs["altitude_m"],
                        min_elevation_deg=gs["min_elevation_deg"],
                        is_active=True
                    ))

            print("  ✓ Verified/Seeded 5 global ground stations (SvalSat, Goldstone, Madrid, Canberra, Kiruna)")

            # 4. Seed Resident Space Debris (Cosmos 2251 Fragment #4812)
            debris_stmt = select(Satellite).where(Satellite.id == "deb-cosmos-2251")
            existing_deb = (await session.execute(debris_stmt)).scalar_one_or_none()
            if not existing_deb:
                session.add(Satellite(
                    id="deb-cosmos-2251",
                    simulation_run_id=sim_run.id,
                    name="Cosmos 2251 Fragment #4812",
                    norad_id=34001,
                    dry_mass_kg=12.5,
                    propellant_mass_kg=0.0,
                    operational_state="DECOMMISSIONED",
                    is_synthetic=True
                ))
            print("  ✓ Verified/Seeded resident space debris (Cosmos 2251 Fragment #4812)")

            # 5. Seed 2 Pre-computed Conjunction Warnings
            conjunction_warnings = [
                {
                    "id": "conj-demo-001",
                    "primary_satellite_id": "sat-001",
                    "secondary_object_id": "deb-cosmos-2251",
                    "tca_epoch": now + timedelta(minutes=45),
                    "miss_distance_m": 43.1,
                    "rel_velocity_mps": 14820.0,
                    "risk_level": "CRITICAL"
                },
                {
                    "id": "conj-demo-002",
                    "primary_satellite_id": "sat-002",
                    "secondary_object_id": "deb-cosmos-2251",
                    "tca_epoch": now + timedelta(hours=3, minutes=15),
                    "miss_distance_m": 4984.8,
                    "rel_velocity_mps": 9240.0,
                    "risk_level": "WARNING"
                }
            ]

            for cw in conjunction_warnings:
                cw_stmt = select(ConjunctionEvent).where(ConjunctionEvent.id == cw["id"])
                existing_cw = (await session.execute(cw_stmt)).scalar_one_or_none()
                if not existing_cw:
                    session.add(ConjunctionEvent(
                        id=cw["id"],
                        primary_satellite_id=cw["primary_satellite_id"],
                        secondary_object_id=cw["secondary_object_id"],
                        tca_epoch=cw["tca_epoch"],
                        miss_distance_m=cw["miss_distance_m"],
                        rel_velocity_mps=cw["rel_velocity_mps"],
                        risk_level=cw["risk_level"],
                        status="DETECTED"
                    ))

            print("  ✓ Verified/Seeded 2 pre-computed orbital conjunction warnings")

    print("=" * 66)
    print("  ORBITOS DEMO SEED COMPLETED SUCCESSFULLY.")
    print("  Ready for Mission Operations on http://localhost:3000")
    print("=" * 66)

def main():
    parser = argparse.ArgumentParser(description="OrbitOS Astrodynamics Engine CLI")
    parser.add_argument(
        "--seed-demo",
        action="store_true",
        help="Idempotently seed orbitos.db with satellites, ground stations, debris, and conjunctions"
    )

    args = parser.parse_args()

    if args.seed_demo:
        asyncio.run(seed_demo())
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
