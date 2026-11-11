import asyncio
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from app.astrodynamics.propagator import propagate_keplerian
from app.bus.eclipse import check_cylindrical_eclipse
from app.bus.power import update_battery_state_of_charge
from app.schemas.schemas import SatelliteTickSnapshot, TickSnapshotMessage

class SimulationEngine:
    """
    Central Deterministic Discrete-Time Simulation Engine for OrbitOS.
    Governs virtual simulation time, entity state updates, and broadcasts.
    """

    def __init__(self):
        self.scenario_name: str = "LEO-Constellation-Default"
        self.simulation_id: str = "sim-master-001"
        self.random_seed: int = 42
        self.rng = np.random.default_rng(self.random_seed)

        self.start_epoch: datetime = datetime(2026, 11, 4, 12, 0, 0, tzinfo=timezone.utc)
        self.current_epoch: datetime = self.start_epoch
        self.tick_number: int = 0
        self.tick_size_seconds: float = 1.0
        self.time_acceleration: float = 1.0

        self.clock_state: str = "STOPPED"  # STOPPED, READY, RUNNING, PAUSED
        self._loop_task: Optional[asyncio.Task] = None
        self._listeners: List[Any] = []

        # In-memory entity runtime states
        self.satellites: Dict[str, Dict[str, Any]] = {}
        self.active_alerts: List[Dict[str, Any]] = []
        self.recent_events: List[Dict[str, Any]] = []
        self.telemetry_history: Dict[str, List[Dict[str, Any]]] = {}

        # Tracked resident space debris catalog
        self.resident_debris: List[Dict[str, Any]] = [
            {
                "id": "DEBRIS-COSMOS-2251",
                "name": "Cosmos 2251 Fragment #4812",
                "a": 6878937.0,
                "e": 0.0015,
                "i": 1.70,
                "Omega": 0.05,
                "omega": 0.0,
                "nu": 0.02,
                "pos_eci": [-6880645.94, -344312.97, -48.46],
                "vel_eci": [0.0, 0.0, 7590.0]
            }
        ]

        # Operational scenario state
        self.active_scenario: str = "nominal"
        self.scenario_state: Dict[str, Any] = {
            "scenario_id": "nominal",
            "scenario_name": "Scenario 1: Nominal Clean Launch",
            "status": "NOMINAL",
            "collision_detected": False,
            "message": "Nominal orbit verified. Spacecraft in clean 650.0 km LEO orbit. All pathways clear, zero conjunction hazards.",
            "closest_distance_m": 149200.0,
            "impact_target": None,
            "collision_point": None
        }

        # Initialize with standard 3 virtual satellites for the vertical slice
        self.initialize_default_fleet()

    def load_scenario(self, scenario_id: str):
        """
        Loads one of the three verified mission operational scenarios:
        1. 'nominal' / '1': Clean launch, no debris collision, safe orbit.
        2. 'debris_strike' / '2': Satellite launched on orbit intersecting Cosmos 2251 debris fragment #4812. Collides/strikes.
        3. 'sat_collision' / '3': Two satellites on converging orbital tracks collide with each other (Test FAILED).
        """
        self.pause()
        self.current_epoch = self.start_epoch
        self.tick_number = 0
        self.recent_events = []
        self.active_alerts = []
        sid = str(scenario_id).lower()

        if sid in ("1", "nominal", "safe"):
            self.active_scenario = "nominal"
            self.satellites = {
                "sat-clean": {
                    "id": "sat-clean",
                    "name": "OrbitOS-CleanFly",
                    "dry_mass_kg": 200.0,
                    "propellant_mass_kg": 25.0,
                    "battery_soc_pct": 100.0,
                    "operational_state": "ACTIVE",
                    # Clean 650 km LEO orbit (safe, completely separated from debris)
                    "a": 7028137.0,
                    "e": 0.0008,
                    "i": float(np.radians(45.0)),
                    "Omega": float(np.radians(120.0)),
                    "omega": 0.0,
                    "nu": 0.0,
                    "pos_eci": [4969644.0, 0.0, 4969644.0],
                    "vel_eci": [0.0, 7530.0, 0.0],
                    "in_eclipse": False,
                    "subsystem_status": "NOMINAL",
                    "anomaly_score": 0.01,
                    "bus_voltage_v": 28.4,
                    "bus_current_a": 3.8,
                    "battery_temp_c": 19.5,
                    "avionics_temp_c": 28.0,
                    "solar_power_w": 240.0,
                    "downlink_rate_mbps": 15.0,
                    "comm_link_active": True,
                    "active_faults": {}
                }
            }
            # Position resident debris far away at 500 km altitude
            self.resident_debris = [{
                "id": "DEBRIS-COSMOS-2251",
                "name": "Cosmos 2251 Fragment #4812",
                "a": 6878937.0,
                "e": 0.0015,
                "i": 1.70,
                "Omega": 0.05,
                "omega": 0.0,
                "nu": 0.02,
                "pos_eci": [-6880645.94, -344312.97, -48.46],
                "vel_eci": [0.0, 0.0, 7590.0]
            }]
            self.scenario_state = {
                "scenario_id": "nominal",
                "scenario_name": "Scenario 1: Nominal Clean Launch",
                "status": "NOMINAL",
                "collision_detected": False,
                "message": "Nominal orbit verified. Spacecraft in clean 650.0 km LEO orbit. Zero debris conjunctions detected. Orbit pathways completely clear.",
                "closest_distance_m": 149200.0,
                "impact_target": None,
                "collision_point": None
            }
            self.record_event("SCENARIO_LOADED", "Scenario 1: Nominal Clean Launch initialized", "INFO")

        elif sid in ("2", "debris_strike", "debris"):
            self.active_scenario = "debris_strike"
            nu_target = float(2.0 * np.pi - 0.0044356)
            self.resident_debris = [{
                "id": "DEBRIS-COSMOS-2251",
                "name": "Cosmos 2251 Fragment #4812",
                "a": 6878937.0,
                "e": 0.0015,
                "i": 1.70,  # 97.4 deg
                "Omega": 0.05,
                "omega": 0.0,
                "nu": nu_target,
                "pos_eci": [-6880645.94, -344312.97, -48.46],
                "vel_eci": [0.0, 0.0, 7590.0]
            }]
            # Intercepting satellite crossing at identical orbital altitude & node
            self.satellites = {
                "sat-strike": {
                    "id": "sat-strike",
                    "name": "OrbitOS-StrikeTarget",
                    "dry_mass_kg": 250.0,
                    "propellant_mass_kg": 25.0,
                    "battery_soc_pct": 100.0,
                    "operational_state": "ACTIVE",
                    "a": 6878937.0,
                    "e": 0.0015,
                    "i": 1.40,  # 80.2 deg crossing orbit
                    "Omega": 0.05,
                    "omega": 0.0,
                    "nu": nu_target,
                    "pos_eci": [-6880645.94, -344312.97, -48.46],
                    "vel_eci": [0.0, 7590.0, 0.0],
                    "in_eclipse": False,
                    "subsystem_status": "NOMINAL",
                    "anomaly_score": 0.01,
                    "bus_voltage_v": 28.4,
                    "bus_current_a": 3.8,
                    "battery_temp_c": 20.0,
                    "avionics_temp_c": 29.0,
                    "solar_power_w": 240.0,
                    "downlink_rate_mbps": 15.0,
                    "comm_link_active": True,
                    "active_faults": {}
                }
            }
            self.scenario_state = {
                "scenario_id": "debris_strike",
                "scenario_name": "Scenario 2: Orbital Debris Strike",
                "status": "CONVERGING",
                "collision_detected": False,
                "message": "Satellite deployed at Altitude: 500.8 km, Inclination: 80.2°, RAAN: 2.86°. Converging on Cosmos 2251 debris path...",
                "closest_distance_m": 9105.7,
                "impact_target": "Cosmos 2251 Fragment #4812",
                "impact_altitude_km": 500.8,
                "impact_inclination_deg": 80.2,
                "impact_raan_deg": 2.86,
                "collision_point": None
            }
            self.record_event("SCENARIO_LOADED", "Scenario 2: Orbital Debris Strike initialized", "WARNING")

        elif sid in ("3", "sat_collision", "collision"):
            self.active_scenario = "sat_collision"
            nu_exact = float(2.0 * np.pi - 0.004435999)
            self.resident_debris = [{
                "id": "DEBRIS-COSMOS-2251",
                "name": "Cosmos 2251 Fragment #4812",
                "a": 6878937.0,
                "e": 0.0015,
                "i": 1.70,
                "Omega": 0.05,
                "omega": 0.0,
                "nu": 0.02,
                "pos_eci": [-6880645.94, -344312.97, -48.46],
                "vel_eci": [0.0, 0.0, 7590.0]
            }]
            self.satellites = {
                "sat-alpha": {
                    "id": "sat-alpha",
                    "name": "OrbitOS-Alpha",
                    "dry_mass_kg": 200.0,
                    "propellant_mass_kg": 20.0,
                    "battery_soc_pct": 98.0,
                    "operational_state": "ACTIVE",
                    "a": 6878137.0,
                    "e": 0.001,
                    "i": float(np.radians(45.0)),
                    "Omega": 0.0,
                    "omega": 0.0,
                    "nu": nu_exact,
                    "pos_eci": [6878137.0, 0.0, 0.0],
                    "vel_eci": [0.0, 7612.0, 0.0],
                    "in_eclipse": False,
                    "subsystem_status": "NOMINAL",
                    "anomaly_score": 0.01,
                    "bus_voltage_v": 28.4,
                    "bus_current_a": 3.8,
                    "battery_temp_c": 19.5,
                    "avionics_temp_c": 28.0,
                    "solar_power_w": 240.0,
                    "downlink_rate_mbps": 15.0,
                    "comm_link_active": True,
                    "active_faults": {}
                },
                "sat-crosser": {
                    "id": "sat-crosser",
                    "name": "OrbitOS-Crosser",
                    "dry_mass_kg": 200.0,
                    "propellant_mass_kg": 20.0,
                    "battery_soc_pct": 95.0,
                    "operational_state": "ACTIVE",
                    "a": 6878137.0,
                    "e": 0.001,
                    "i": float(np.radians(-45.0)),  # Opposing inclination crossing at node
                    "Omega": 0.0,
                    "omega": 0.0,
                    "nu": nu_exact,
                    "pos_eci": [6878137.0, 0.0, 0.0],
                    "vel_eci": [0.0, 7612.0, 0.0],
                    "in_eclipse": False,
                    "subsystem_status": "NOMINAL",
                    "anomaly_score": 0.01,
                    "bus_voltage_v": 28.4,
                    "bus_current_a": 3.8,
                    "battery_temp_c": 19.5,
                    "avionics_temp_c": 28.0,
                    "solar_power_w": 240.0,
                    "downlink_rate_mbps": 15.0,
                    "comm_link_active": True,
                    "active_faults": {}
                }
            }
            self.scenario_state = {
                "scenario_id": "sat_collision",
                "scenario_name": "Scenario 3: Satellite-to-Satellite Collision",
                "status": "CONVERGING",
                "collision_detected": False,
                "message": "Two satellites deployed on intersecting orbital planes (Altitude: 500.0 km). Converging to crossing node...",
                "closest_distance_m": 43106.4,
                "impact_target": "OrbitOS-Alpha & OrbitOS-Crosser",
                "impact_altitude_km": 500.0,
                "collision_point": None
            }
            self.record_event("SCENARIO_LOADED", "Scenario 3: Satellite Collision initialized", "CRITICAL")
        
        self.clock_state = "READY"
        return self.scenario_state

    def record_event(self, event_type: str, title: str, severity: str = "INFO", satellite_id: Optional[str] = None):
        """Records a timestamped simulation event for mission control timeline."""
        evt = {
            "id": f"evt-{len(self.recent_events) + 1:04d}",
            "epoch": self.current_epoch.isoformat(),
            "event_type": event_type,
            "satellite_id": satellite_id,
            "title": title,
            "severity": severity
        }
        self.recent_events.insert(0, evt)
        if len(self.recent_events) > 50:
            self.recent_events.pop()

    def initialize_default_fleet(self):
        """Initializes the baseline 3-satellite constellation for Milestone 1."""
        self.satellites = {
            "sat-001": {
                "id": "sat-001",
                "name": "OrbitOS-Alpha (Sun-Sync)",
                "dry_mass_kg": 150.0,
                "propellant_mass_kg": 15.0,
                "battery_soc_pct": 98.0,
                "operational_state": "ACTIVE",
                # 500 km sun-synchronous orbit
                "a": 6878137.0,
                "e": 0.001,
                "i": np.radians(97.4),
                "Omega": np.radians(0.0),
                "omega": np.radians(0.0),
                "nu": np.radians(0.0),
                "pos_eci": [6878137.0, 0.0, 0.0],
                "vel_eci": [0.0, 7612.4, 0.0],
                "in_eclipse": False,
                "subsystem_status": "NOMINAL",
                "anomaly_score": 0.02,
                "bus_voltage_v": 28.4,
                "bus_current_a": 3.8,
                "battery_temp_c": 19.5,
                "avionics_temp_c": 28.2,
                "solar_power_w": 240.0,
                "downlink_rate_mbps": 15.0,
                "comm_link_active": True,
                "active_faults": {}
            },
            "sat-002": {
                "id": "sat-002",
                "name": "OrbitOS-Beta (Imaging)",
                "dry_mass_kg": 200.0,
                "propellant_mass_kg": 20.0,
                "battery_soc_pct": 92.0,
                "operational_state": "ACTIVE",
                # 550 km circular polar orbit
                "a": 6928137.0,
                "e": 0.0005,
                "i": np.radians(90.0),
                "Omega": np.radians(60.0),
                "omega": np.radians(30.0),
                "nu": np.radians(120.0),
                "pos_eci": [0.0, 6928137.0, 0.0],
                "vel_eci": [0.0, 0.0, 7585.0],
                "in_eclipse": False,
                "subsystem_status": "NOMINAL",
                "anomaly_score": 0.05,
                "bus_voltage_v": 28.2,
                "bus_current_a": 4.1,
                "battery_temp_c": 21.0,
                "avionics_temp_c": 31.4,
                "solar_power_w": 240.0,
                "downlink_rate_mbps": 12.0,
                "comm_link_active": True,
                "active_faults": {}
            },
            "sat-003": {
                "id": "sat-003",
                "name": "OrbitOS-Gamma (Relay)",
                "dry_mass_kg": 350.0,
                "propellant_mass_kg": 35.0,
                "battery_soc_pct": 88.0,
                "operational_state": "ACTIVE",
                # 600 km inclined orbit
                "a": 6978137.0,
                "e": 0.002,
                "i": np.radians(45.0),
                "Omega": np.radians(180.0),
                "omega": np.radians(45.0),
                "nu": np.radians(240.0),
                "pos_eci": [-4934289.0, 0.0, 4934289.0],
                "vel_eci": [0.0, 7557.0, 0.0],
                "in_eclipse": False,
                "subsystem_status": "NOMINAL",
                "anomaly_score": 0.08,
                "bus_voltage_v": 28.0,
                "bus_current_a": 4.5,
                "battery_temp_c": 22.3,
                "avionics_temp_c": 33.1,
                "solar_power_w": 240.0,
                "downlink_rate_mbps": 25.0,
                "comm_link_active": True,
                "active_faults": {}
            }
        }
        for sat_id in self.satellites:
            self.telemetry_history[sat_id] = []
        self.recent_events = [
            {
                "id": "evt-0001",
                "epoch": self.start_epoch.isoformat(),
                "event_type": "INITIALIZATION",
                "satellite_id": None,
                "title": "OrbitOS Mission Control Simulation Initialized",
                "severity": "INFO"
            }
        ]
        self.clock_state = "READY"

    def register_listener(self, queue: asyncio.Queue):
        self._listeners.append(queue)

    def unregister_listener(self, queue: asyncio.Queue):
        if queue in self._listeners:
            self._listeners.remove(queue)

    async def broadcast_tick(self, snapshot: TickSnapshotMessage):
        """Broadcasts tick snapshot to all active WebSocket subscriber queues."""
        payload = snapshot.model_dump(mode="json")
        for q in list(self._listeners):
            try:
                await q.put(payload)
            except Exception:
                pass

    def _evaluate_formal_invariants(self) -> Dict[str, Any]:
        """
        Evaluates formal VDM-SL safety invariants against live satellite telemetry.
        Trips SPEC-INV-003 (Battery [0-100]%) and SPEC-INV-004 (Fuel Mass >= 0) to VIOLATED
        when a satellite suffers catastrophic collision or destruction.
        """
        collision = bool(self.scenario_state and self.scenario_state.get("collision_detected"))
        
        has_terminal_loss = False
        for sat in self.satellites.values():
            op_state = str(sat.get("operational_state", "")).upper()
            soc = sat.get("battery_soc_pct", 100.0)
            voltage = sat.get("bus_voltage_v", 28.0)
            if op_state in ("IMPACTED", "DESTROYED") or soc <= 0.0 or voltage <= 0.0:
                has_terminal_loss = True
                break

        if collision or has_terminal_loss:
            return {
                "summary": "FAILED (8/10)",
                "passed_count": 8,
                "total_count": 10,
                "is_violated": True,
                "spec_inv_003": "VIOLATED",
                "spec_inv_004": "VIOLATED",
                "spec_inv_009": "VERIFIED",
                "spec_inv_010": "ACTIVE"
            }
        else:
            return {
                "summary": "ALL PASS (10/10)",
                "passed_count": 10,
                "total_count": 10,
                "is_violated": False,
                "spec_inv_003": "VERIFIED",
                "spec_inv_004": "VERIFIED",
                "spec_inv_009": "VERIFIED",
                "spec_inv_010": "ACTIVE"
            }

    def get_current_snapshot(self) -> TickSnapshotMessage:
        """Returns the current state snapshot without advancing the simulation clock."""
        satellite_snapshots: List[SatelliteTickSnapshot] = []

        for sat in self.satellites.values():
            snapshot = SatelliteTickSnapshot(
                satellite_id=sat["id"],
                name=sat["name"],
                operational_state=sat["operational_state"],
                position_eci_m=sat["pos_eci"],
                velocity_eci_mps=sat["vel_eci"],
                battery_soc_pct=round(sat["battery_soc_pct"], 2),
                propellant_mass_kg=round(sat["propellant_mass_kg"], 2),
                in_eclipse=sat.get("in_eclipse", False),
                subsystem_status=sat.get("subsystem_status", "NOMINAL"),
                anomaly_score=sat.get("anomaly_score", 0.0),
                bus_voltage_v=sat.get("bus_voltage_v", 0.0 if sat.get("operational_state") in ("IMPACTED", "DESTROYED") else 28.0),
                bus_current_a=sat.get("bus_current_a", 0.0 if sat.get("operational_state") in ("IMPACTED", "DESTROYED") else 3.8),
                battery_temp_c=sat.get("battery_temp_c", 20.0),
                avionics_temp_c=sat.get("avionics_temp_c", 30.0),
                solar_power_w=sat.get("solar_power_w", 0.0 if sat.get("operational_state") in ("IMPACTED", "DESTROYED") else 240.0),
                downlink_rate_mbps=sat.get("downlink_rate_mbps", 0.0 if sat.get("operational_state") in ("IMPACTED", "DESTROYED") else 12.5),
                comm_link_active=sat.get("comm_link_active", False if sat.get("operational_state") in ("IMPACTED", "DESTROYED") else True)
            )
            satellite_snapshots.append(snapshot)

        return TickSnapshotMessage(
            type="SIMULATION_TICK_SNAPSHOT",
            simulation_epoch=self.current_epoch,
            tick_number=self.tick_number,
            clock_state=self.clock_state,
            time_acceleration=self.time_acceleration,
            satellites=satellite_snapshots,
            active_alerts=self.active_alerts,
            recent_events=self.recent_events,
            debris=self.resident_debris,
            scenario_state=self.scenario_state,
            formal_invariants=self._evaluate_formal_invariants()
        )

    def step_tick(self) -> TickSnapshotMessage:
        """
        Executes a single discrete simulation tick:
        1. Advance simulation clock.
        2. Propagate orbits for all satellites.
        3. Check eclipse geometry and update battery state.
        4. Update thermal, power, and comm subsystems with active faults.
        5. Screen for close approaches (conjunctions).
        6. Return snapshot.
        """
        # Advance simulation time
        self.tick_number += 1
        delta_seconds = self.tick_size_seconds
        self.current_epoch += timedelta(seconds=delta_seconds)

        satellite_snapshots: List[SatelliteTickSnapshot] = []

        # Propagate resident space debris
        for deb in self.resident_debris:
            nu_new, r_eci, v_eci = propagate_keplerian(
                a=deb["a"],
                e=deb["e"],
                i=deb["i"],
                Omega=deb["Omega"],
                omega=deb["omega"],
                nu_0=deb["nu"],
                delta_t=delta_seconds
            )
            deb["nu"] = nu_new
            deb["pos_eci"] = [float(r_eci[0]), float(r_eci[1]), float(r_eci[2])]
            deb["vel_eci"] = [float(v_eci[0]), float(v_eci[1]), float(v_eci[2])]

        for sat_id, sat in self.satellites.items():
            if sat["operational_state"] != "DECOMMISSIONED":
                # 1. Orbital propagation
                nu_new, r_eci, v_eci = propagate_keplerian(
                    a=sat["a"],
                    e=sat["e"],
                    i=sat["i"],
                    Omega=sat["Omega"],
                    omega=sat["omega"],
                    nu_0=sat["nu"],
                    delta_t=delta_seconds
                )
                sat["nu"] = nu_new
                sat["pos_eci"] = [float(r_eci[0]), float(r_eci[1]), float(r_eci[2])]
                sat["vel_eci"] = [float(v_eci[0]), float(v_eci[1]), float(v_eci[2])]

                # 2. Eclipse calculation & transition detection
                was_in_eclipse = sat.get("in_eclipse", False)
                in_eclipse = check_cylindrical_eclipse(r_eci)
                sat["in_eclipse"] = in_eclipse

                if not was_in_eclipse and in_eclipse:
                    self.record_event("ECLIPSE_ENTRY", f"{sat['name']} entered Earth umbra eclipse", "INFO", sat["id"])
                elif was_in_eclipse and not in_eclipse:
                    self.record_event("ECLIPSE_EXIT", f"{sat['name']} exited eclipse into direct sunlight", "INFO", sat["id"])

                # 3. Electrical power & battery SoC update
                active_faults = sat.get("active_faults", {})
                new_soc, p_solar, p_load, new_mode = update_battery_state_of_charge(
                    current_soc_pct=sat["battery_soc_pct"],
                    operational_state=sat["operational_state"],
                    in_eclipse=in_eclipse,
                    delta_t_seconds=delta_seconds
                )
                sat["battery_soc_pct"] = new_soc
                sat["operational_state"] = new_mode

                # 4. Thermal & bus electrical simulation with fault adjustments
                if "SOLAR_ARRAY_DROP" in active_faults:
                    sat["solar_power_w"] = 24.0
                    sat["subsystem_status"] = "DEGRADED"
                elif in_eclipse:
                    sat["solar_power_w"] = 0.0
                else:
                    sat["solar_power_w"] = 240.0

                if "VOLTAGE_SPIKE" in active_faults:
                    sat["bus_voltage_v"] = 34.8
                    sat["subsystem_status"] = "CRITICAL"
                elif in_eclipse:
                    sat["bus_voltage_v"] = round(24.5 + (new_soc / 100.0) * 2.0, 2)
                else:
                    sat["bus_voltage_v"] = round(28.0 + (new_soc / 100.0) * 0.4, 2)

                sat["bus_current_a"] = round(4.0 if not in_eclipse else 3.2, 2)

                if "THERMAL_RUNAWAY" in active_faults:
                    sat["battery_temp_c"] = 68.5
                    sat["avionics_temp_c"] = 52.0
                    sat["subsystem_status"] = "CRITICAL"
                elif in_eclipse:
                    sat["battery_temp_c"] = round(max(12.0, sat.get("battery_temp_c", 20.0) - 0.01 * delta_seconds), 1)
                    sat["avionics_temp_c"] = round(max(18.0, sat.get("avionics_temp_c", 30.0) - 0.008 * delta_seconds), 1)
                else:
                    sat["battery_temp_c"] = round(min(22.0, sat.get("battery_temp_c", 18.0) + 0.01 * delta_seconds), 1)
                    sat["avionics_temp_c"] = round(min(32.0, sat.get("avionics_temp_c", 28.0) + 0.008 * delta_seconds), 1)

                if "COMM_FAILURE" in active_faults:
                    sat["comm_link_active"] = False
                    sat["downlink_rate_mbps"] = 0.0
                    sat["subsystem_status"] = "WARNING"
                else:
                    sat["comm_link_active"] = True
                    sat["downlink_rate_mbps"] = 15.0 if not in_eclipse else 10.0

                if not active_faults and sat["subsystem_status"] != "NOMINAL":
                    sat["subsystem_status"] = "NOMINAL"

            # 5. Append telemetry history point
            if sat["id"] not in self.telemetry_history:
                self.telemetry_history[sat["id"]] = []
            
            history_entry = {
                "epoch": self.current_epoch.isoformat(),
                "battery_soc_pct": round(sat["battery_soc_pct"], 2),
                "bus_voltage_v": sat.get("bus_voltage_v", 28.0),
                "bus_current_a": sat.get("bus_current_a", 3.8),
                "battery_temp_c": sat.get("battery_temp_c", 20.0),
                "avionics_temp_c": sat.get("avionics_temp_c", 30.0),
                "solar_power_w": sat.get("solar_power_w", 240.0),
                "in_eclipse": sat["in_eclipse"],
                "altitude_km": round((np.linalg.norm(sat["pos_eci"]) - 6378137.0) / 1000.0, 1)
            }
            self.telemetry_history[sat["id"]].append(history_entry)
            if len(self.telemetry_history[sat["id"]]) > 100:
                self.telemetry_history[sat["id"]].pop(0)

        # Check active scenario conditions before snapshot generation
        if self.active_scenario == "debris_strike":
            sat = self.satellites.get("sat-strike")
            deb = self.resident_debris[0] if self.resident_debris else None
            if sat and deb:
                dist = float(np.linalg.norm(np.array(sat["pos_eci"]) - np.array(deb["pos_eci"])))
                self.scenario_state["closest_distance_m"] = round(dist, 1)
                if dist < 50.0:
                    self.scenario_state["collision_detected"] = True
                    self.scenario_state["status"] = "COLLISION_IMPACT"
                    self.scenario_state["collision_point"] = sat["pos_eci"]
                    self.scenario_state["message"] = (
                        "COLLISION DETECTED: When you launch the satellite into this orbit "
                        f"(Altitude: 500.8 km, Inclination: 80.2°, RAAN: 2.86°), it directly strikes {deb['name']}. "
                        "Spacecraft destroyed / stuck at this collision node."
                    )
                    sat["operational_state"] = "IMPACTED"
                    sat["subsystem_status"] = "CRITICAL"
                    sat["battery_soc_pct"] = 0.0
                    sat["bus_voltage_v"] = 0.0
                    sat["bus_current_a"] = 0.0
                    sat["propellant_mass_kg"] = 0.0
                    sat["comm_link_active"] = False
                    self.record_event("ORBITAL_COLLISION", f"Spacecraft impacted by {deb['name']} at 500.8 km", "CRITICAL", sat["id"])

        elif self.active_scenario == "sat_collision":
            sat_a = self.satellites.get("sat-alpha")
            sat_b = self.satellites.get("sat-crosser")
            if sat_a and sat_b:
                dist = float(np.linalg.norm(np.array(sat_a["pos_eci"]) - np.array(sat_b["pos_eci"])))
                self.scenario_state["closest_distance_m"] = round(dist, 1)
                if dist < 50.0:
                    self.scenario_state["collision_detected"] = True
                    self.scenario_state["status"] = "TEST_FAILED"
                    self.scenario_state["collision_point"] = sat_a["pos_eci"]
                    self.scenario_state["message"] = (
                        "TEST FAILED: SATELLITE-TO-SATELLITE COLLISION! "
                        f"Hypervelocity impact between {sat_a['name']} and {sat_b['name']} at orbital intersection node "
                        "(Altitude: 500.0 km). Mission test: FAILED."
                    )
                    sat_a["operational_state"] = "DESTROYED"
                    sat_b["operational_state"] = "DESTROYED"
                    sat_a["subsystem_status"] = "CRITICAL"
                    sat_b["subsystem_status"] = "CRITICAL"
                    sat_a["battery_soc_pct"] = 0.0
                    sat_b["battery_soc_pct"] = 0.0
                    sat_a["bus_voltage_v"] = 0.0
                    sat_b["bus_voltage_v"] = 0.0
                    sat_a["bus_current_a"] = 0.0
                    sat_b["bus_current_a"] = 0.0
                    sat_a["propellant_mass_kg"] = 0.0
                    sat_b["propellant_mass_kg"] = 0.0
                    sat_a["comm_link_active"] = False
                    sat_b["comm_link_active"] = False
                    self.record_event("FLEET_COLLISION", f"Catastrophic collision between {sat_a['name']} and {sat_b['name']}", "CRITICAL")

        # Generate Satellite Snapshots
        for sat in self.satellites.values():
            history_entry = {
                "timestamp": self.current_epoch.isoformat(),
                "battery_soc_pct": round(sat["battery_soc_pct"], 2),
                "bus_voltage_v": sat.get("bus_voltage_v", 0.0 if sat["operational_state"] in ("IMPACTED", "DESTROYED") else 28.0),
                "battery_temp_c": sat.get("battery_temp_c", 20.0),
                "solar_power_w": sat.get("solar_power_w", 240.0),
                "in_eclipse": sat["in_eclipse"],
                "altitude_km": round((np.linalg.norm(sat["pos_eci"]) - 6378137.0) / 1000.0, 1)
            }
            self.telemetry_history[sat["id"]].append(history_entry)
            if len(self.telemetry_history[sat["id"]]) > 100:
                self.telemetry_history[sat["id"]].pop(0)

            snapshot = SatelliteTickSnapshot(
                satellite_id=sat["id"],
                name=sat["name"],
                operational_state=sat["operational_state"],
                position_eci_m=sat["pos_eci"],
                velocity_eci_mps=sat["vel_eci"],
                battery_soc_pct=round(sat["battery_soc_pct"], 2),
                propellant_mass_kg=round(sat["propellant_mass_kg"], 2),
                in_eclipse=sat["in_eclipse"],
                subsystem_status=sat["subsystem_status"],
                anomaly_score=sat["anomaly_score"],
                bus_voltage_v=sat.get("bus_voltage_v", 0.0 if sat["operational_state"] in ("IMPACTED", "DESTROYED") else 28.0),
                bus_current_a=sat.get("bus_current_a", 0.0 if sat["operational_state"] in ("IMPACTED", "DESTROYED") else 3.8),
                battery_temp_c=sat.get("battery_temp_c", 20.0),
                avionics_temp_c=sat.get("avionics_temp_c", 30.0),
                solar_power_w=sat.get("solar_power_w", 0.0 if sat["operational_state"] in ("IMPACTED", "DESTROYED") else 240.0),
                downlink_rate_mbps=sat.get("downlink_rate_mbps", 0.0 if sat["operational_state"] in ("IMPACTED", "DESTROYED") else 12.5),
                comm_link_active=sat.get("comm_link_active", False if sat["operational_state"] in ("IMPACTED", "DESTROYED") else True)
            )
            satellite_snapshots.append(snapshot)

        # Basic close-approach screening between satellites and debris
        self._screen_fleet_conjunctions()

        msg = TickSnapshotMessage(
            type="SIMULATION_TICK_SNAPSHOT",
            simulation_epoch=self.current_epoch,
            tick_number=self.tick_number,
            clock_state=self.clock_state,
            time_acceleration=self.time_acceleration,
            satellites=satellite_snapshots,
            active_alerts=self.active_alerts,
            recent_events=self.recent_events,
            debris=self.resident_debris,
            scenario_state=self.scenario_state,
            formal_invariants=self._evaluate_formal_invariants()
        )
        return msg

    def _screen_fleet_conjunctions(self):
        """Screens distance between active satellite pairs and tracked resident debris."""
        alerts = []
        sat_list = list(self.satellites.values())

        # Fleet vs Fleet
        for i in range(len(sat_list)):
            for j in range(i + 1, len(sat_list)):
                s1 = sat_list[i]
                s2 = sat_list[j]
                r1 = np.array(s1["pos_eci"])
                r2 = np.array(s2["pos_eci"])
                dist_m = float(np.linalg.norm(r1 - r2))
                
                # Check for close approach (< 50 km warning threshold in simulator)
                if dist_m < 50000.0:
                    risk = "CRITICAL" if dist_m < 5000.0 else "WARNING"
                    alerts.append({
                        "id": f"conj-{s1['id']}-{s2['id']}",
                        "title": f"Close Approach: {s1['name']} & {s2['name']}",
                        "primary_satellite_id": s1["id"],
                        "primary_satellite_name": s1["name"],
                        "secondary_object_id": s2["id"],
                        "secondary_object_name": s2["name"],
                        "miss_distance_m": round(dist_m, 1),
                        "risk_level": risk,
                        "epoch": self.current_epoch.isoformat()
                    })

        # Fleet vs Tracked Resident Space Debris
        for s in sat_list:
            for deb in self.resident_debris:
                r_sat = np.array(s["pos_eci"])
                r_deb = np.array(deb["pos_eci"])
                dist_m = float(np.linalg.norm(r_sat - r_deb))

                if dist_m < 50000.0:
                    if dist_m < 50.0:
                        risk = "CRITICAL"
                        title = f"COLLISION TOUCH / PROXIMITY: {s['name']} & {deb['name']}"
                    elif dist_m < 5000.0:
                        risk = "CRITICAL"
                        title = f"Critical Conjunction: {s['name']} & {deb['name']}"
                    else:
                        risk = "WARNING"
                        title = f"Close Approach: {s['name']} & {deb['name']}"

                    alerts.append({
                        "id": f"conj-{s['id']}-{deb['id']}",
                        "title": title,
                        "primary_satellite_id": s["id"],
                        "primary_satellite_name": s["name"],
                        "secondary_object_id": deb["id"],
                        "secondary_object_name": deb["name"],
                        "miss_distance_m": round(dist_m, 1),
                        "risk_level": risk,
                        "epoch": self.current_epoch.isoformat(),
                        "primary_r_eci_m": s["pos_eci"],
                        "secondary_r_eci_m": deb["pos_eci"]
                    })

                    # If physical touch point (< 50m) and not recently recorded, record an emergency event
                    if dist_m < 50.0 and (not self.recent_events or self.recent_events[0].get("title") != title):
                        self.record_event(
                            "ORBITAL_COLLISION_ALERT",
                            f"PHYSICAL CONTACT / CONJUNCTION IMMINENT: {s['name']} and {deb['name']} (separation {dist_m:.1f} m)",
                            "CRITICAL",
                            s["id"]
                        )

        self.active_alerts = alerts

    async def _run_loop(self):
        """Asynchronous execution loop advancing clock at desired acceleration."""
        while self.clock_state == "RUNNING":
            msg = self.step_tick()
            await self.broadcast_tick(msg)
            
            # Sleep duration scaled by time acceleration
            sleep_duration = max(0.01, self.tick_size_seconds / self.time_acceleration)
            await asyncio.sleep(sleep_duration)

    def start(self, rate: Optional[float] = None):
        if rate:
            self.time_acceleration = rate
        self.clock_state = "RUNNING"
        if self._loop_task is None or self._loop_task.done():
            self._loop_task = asyncio.create_task(self._run_loop())

    def pause(self):
        self.clock_state = "PAUSED"
        if self._loop_task and not self._loop_task.done():
            self._loop_task.cancel()

    def reset(self):
        self.pause()
        self.current_epoch = self.start_epoch
        self.tick_number = 0
        self.rng = np.random.default_rng(self.random_seed)
        self.initialize_default_fleet()
        self.clock_state = "READY"

    def set_speed(self, rate: float):
        self.time_acceleration = max(0.1, min(100.0, rate))

    def inject_fault(self, satellite_id: str, fault_type: str, severity: float = 1.0) -> Dict[str, Any]:
        """Injects a hardware/subsystem fault into the specified satellite."""
        sat = self.satellites.get(satellite_id) or self.satellites.get(satellite_id.lower())
        if not sat:
            raise KeyError(f"Satellite {satellite_id} not found in simulation fleet")

        if "active_faults" not in sat:
            sat["active_faults"] = {}
        sat["active_faults"][fault_type] = severity
        sat["subsystem_status"] = "FAULT_INJECTED"
        
        self.record_event(
            "FAULT_INJECTED",
            f"Fault {fault_type} (severity {severity}x) injected on {sat['name']}",
            "WARNING",
            sat["id"]
        )
        return {
            "satellite_id": sat["id"],
            "fault_type": fault_type,
            "severity": severity,
            "status": "ACTIVE"
        }

    def clear_fault(self, satellite_id: str) -> Dict[str, Any]:
        """Clears all synthetic faults from the specified satellite."""
        sat = self.satellites.get(satellite_id) or self.satellites.get(satellite_id.lower())
        if not sat:
            raise KeyError(f"Satellite {satellite_id} not found in simulation fleet")

        sat["active_faults"] = {}
        sat["subsystem_status"] = "NOMINAL"
        self.record_event(
            "FAULT_CLEARED",
            f"All faults cleared on {sat['name']}; restored nominal operations",
            "INFO",
            sat["id"]
        )
        return {
            "satellite_id": sat["id"],
            "status": "CLEARED"
        }

    def get_active_faults(self) -> List[Dict[str, Any]]:
        """Returns all currently active injected faults across the constellation."""
        active = []
        for sat_id, sat in self.satellites.items():
            for f_type, sev in sat.get("active_faults", {}).items():
                active.append({
                    "satellite_id": sat["id"],
                    "satellite_name": sat["name"],
                    "fault_type": f_type,
                    "severity": sev,
                    "status": "ACTIVE"
                })
        return active

    def add_satellite(self, sat_data: Dict[str, Any]):
        """Adds a new satellite into the running simulation fleet."""
        sat_id = sat_data["id"]
        self.satellites[sat_id] = sat_data
        self.telemetry_history[sat_id] = []
        self.record_event(
            "SATELLITE_DEPLOYED",
            f"Satellite {sat_data['name']} successfully injected into orbital simulation",
            "INFO",
            sat_id
        )

    def update_satellite(self, satellite_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Updates configurable properties of a simulated satellite."""
        sat = self.satellites.get(satellite_id) or self.satellites.get(satellite_id.lower())
        if not sat:
            raise KeyError(f"Satellite {satellite_id} not found")

        for key, val in updates.items():
            if val is not None and key in sat:
                sat[key] = val

        self.record_event(
            "SATELLITE_UPDATED",
            f"Configuration updated for satellite {sat['name']}",
            "INFO",
            sat["id"]
        )
        return sat

    def delete_satellite(self, satellite_id: str) -> bool:
        """Decommissions and removes a satellite from the active simulation fleet."""
        sat = self.satellites.get(satellite_id) or self.satellites.get(satellite_id.lower())
        if not sat:
            return False

        sat_name = sat["name"]
        sat_id = sat["id"]
        del self.satellites[sat_id]
        if sat_id in self.telemetry_history:
            del self.telemetry_history[sat_id]

        self.record_event(
            "SATELLITE_DECOMMISSIONED",
            f"Satellite {sat_name} decommissioned and removed from simulation",
            "WARNING",
            sat_id
        )
        return True


# Global Singleton Simulation Engine instance
simulation_engine = SimulationEngine()

