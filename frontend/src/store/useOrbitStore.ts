import { create } from 'zustand';
import { SatelliteTelemetry, ConjunctionAlert, TickSnapshotMessage, SimulationEvent, ScenarioState } from '../types';

interface OrbitStore {
  simulationEpoch: string;
  clockState: 'STOPPED' | 'READY' | 'RUNNING' | 'PAUSED';
  timeAcceleration: number;
  tickNumber: number;
  satellites: Record<string, SatelliteTelemetry>;
  selectedSatelliteId: string | null;
  activeAlerts: ConjunctionAlert[];
  recentEvents: SimulationEvent[];
  debrisList: any[];
  scenarioState: ScenarioState | null;
  isWsConnected: boolean;
  showDebris: boolean;
  showGroundStations: boolean;
  showTracks: boolean;

  setSnapshot: (snapshot: TickSnapshotMessage) => void;
  setSelectedSatellite: (id: string | null) => void;
  setScenarioState: (state: ScenarioState | null) => void;
  setWsConnected: (connected: boolean) => void;
  setShowDebris: (show: boolean) => void;
  setShowGroundStations: (show: boolean) => void;
  setShowTracks: (show: boolean) => void;
}

const INITIAL_SATELLITES: Record<string, SatelliteTelemetry> = {
  'sat-001': {
    satellite_id: 'sat-001',
    name: 'OrbitOS-Pioneer-X',
    operational_state: 'ACTIVE',
    position_eci_m: [6878137.0, 0.0, 0.0],
    velocity_eci_mps: [0.0, 5382.0, 5382.0],
    battery_soc_pct: 94.2,
    propellant_mass_kg: 24.8,
    in_eclipse: false,
    subsystem_status: 'NOMINAL',
    anomaly_score: 0.02,
    bus_voltage_v: 28.4,
    bus_current_a: 4.8,
    battery_temp_c: 21.5,
    avionics_temp_c: 24.1,
    solar_power_w: 420.0,
    downlink_rate_mbps: 150.0,
    comm_link_active: true,
  },
  'sat-002': {
    satellite_id: 'sat-002',
    name: 'OrbitOS-Vanguard-1',
    operational_state: 'ACTIVE',
    position_eci_m: [0.0, 7178137.0, 0.0],
    velocity_eci_mps: [-5269.0, 0.0, 5269.0],
    battery_soc_pct: 88.6,
    propellant_mass_kg: 38.2,
    in_eclipse: false,
    subsystem_status: 'NOMINAL',
    anomaly_score: 0.01,
    bus_voltage_v: 28.2,
    bus_current_a: 4.2,
    battery_temp_c: 19.8,
    avionics_temp_c: 22.4,
    solar_power_w: 405.0,
    downlink_rate_mbps: 150.0,
    comm_link_active: true,
  },
};

const INITIAL_DEBRIS = [
  {
    debris_id: 'DEBRIS-COSMOS-2251',
    name: 'Cosmos 2251 Fragment #4812',
    position_eci_m: [6878937.0, 0.0, 0.0],
    velocity_eci_mps: [0.0, 7612.0, 0.0],
    radar_cross_section_m2: 0.85,
  },
];

export const useOrbitStore = create<OrbitStore>((set) => ({
  simulationEpoch: '2026-11-04T12:00:00Z',
  clockState: 'READY',
  timeAcceleration: 1.0,
  tickNumber: 0,
  satellites: INITIAL_SATELLITES,
  selectedSatelliteId: 'sat-001',
  activeAlerts: [],
  recentEvents: [],
  debrisList: INITIAL_DEBRIS,
  scenarioState: {
    scenario_id: 'nominal',
    scenario_name: 'Scenario 1: Nominal Clean Launch',
    status: 'NOMINAL',
    collision_detected: false,
    message: 'Nominal orbit verified. Spacecraft in clean 650.0 km LEO orbit. Zero debris conjunctions detected. Orbit pathways completely clear.',
    closest_distance_m: 149200.0,
    impact_target: null,
    collision_point: null
  },
  isWsConnected: false,
  showDebris: true,
  showGroundStations: true,
  showTracks: true,

  setSnapshot: (snapshot) => {
    const satMap: Record<string, SatelliteTelemetry> = {};
    for (const s of snapshot.satellites) {
      satMap[s.satellite_id] = s;
    }
    set((state) => ({
      simulationEpoch: snapshot.simulation_epoch,
      clockState: snapshot.clock_state,
      timeAcceleration: snapshot.time_acceleration,
      tickNumber: snapshot.tick_number,
      satellites: satMap,
      activeAlerts: snapshot.active_alerts || [],
      recentEvents: snapshot.recent_events || [],
      debrisList: snapshot.debris || [],
      scenarioState: snapshot.scenario_state ?? state.scenarioState,
    }));
  },

  setSelectedSatellite: (id) => set({ selectedSatelliteId: id }),
  setScenarioState: (scState) => set({ scenarioState: scState }),
  setWsConnected: (connected) => set({ isWsConnected: connected }),
  setShowDebris: (show) => set({ showDebris: show }),
  setShowGroundStations: (show) => set({ showGroundStations: show }),
  setShowTracks: (show) => set({ showTracks: show }),
}));

