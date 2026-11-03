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

        # Initialize with standard 3 virtual satellites for the vertical slice
        self.initialize_default_fleet()

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
                "anomaly_score": 0.02
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
                "anomaly_score": 0.05
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
                "anomaly_score": 0.08
            }
        }
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

    def step_tick(self) -> TickSnapshotMessage:
        """
        Executes a single discrete simulation tick:
        1. Advance simulation clock.
        2. Propagate orbits for all satellites.
        3. Check eclipse geometry and update battery state.
        4. Screen for close approaches (conjunctions).
        5. Return snapshot.
        """
        # Advance simulation time
        self.tick_number += 1
        delta_seconds = self.tick_size_seconds
        self.current_epoch += timedelta(seconds=delta_seconds)

        satellite_snapshots: List[SatelliteTickSnapshot] = []

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

                # 2. Eclipse calculation
                in_eclipse = check_cylindrical_eclipse(r_eci)
                sat["in_eclipse"] = in_eclipse

                # 3. Electrical power & battery SoC update
                new_soc, p_solar, p_load, new_mode = update_battery_state_of_charge(
                    current_soc_pct=sat["battery_soc_pct"],
                    operational_state=sat["operational_state"],
                    in_eclipse=in_eclipse,
                    delta_t_seconds=delta_seconds
                )
                sat["battery_soc_pct"] = new_soc
                sat["operational_state"] = new_mode

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
                anomaly_score=sat["anomaly_score"]
            )
            satellite_snapshots.append(snapshot)

        # Basic close-approach screening between satellites
        self._screen_fleet_conjunctions()

        msg = TickSnapshotMessage(
            type="SIMULATION_TICK_SNAPSHOT",
            simulation_epoch=self.current_epoch,
            tick_number=self.tick_number,
            clock_state=self.clock_state,
            time_acceleration=self.time_acceleration,
            satellites=satellite_snapshots,
            active_alerts=self.active_alerts
        )
        return msg

    def _screen_fleet_conjunctions(self):
        """Screens distance between active satellite pairs."""
        alerts = []
        sat_list = list(self.satellites.values())
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
                        "miss_distance_m": round(dist_m, 1),
                        "risk_level": risk,
                        "epoch": self.current_epoch.isoformat()
                    })
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


# Global Singleton Simulation Engine instance
simulation_engine = SimulationEngine()

