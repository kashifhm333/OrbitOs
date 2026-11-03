export type OperationalState = 
  | 'CREATION'
  | 'STANDBY'
  | 'ACTIVE'
  | 'MANEUVERING'
  | 'DEGRADED'
  | 'SAFE_HOLD'
  | 'DECOMMISSIONED';

export interface SatelliteTelemetry {
  satellite_id: string;
  name: string;
  operational_state: OperationalState;
  position_eci_m: [number, number, number];
  velocity_eci_mps: [number, number, number];
  battery_soc_pct: number;
  propellant_mass_kg: number;
  in_eclipse: boolean;
  subsystem_status: string;
  anomaly_score: number;
}

export interface SatelliteEntity {
  id: string;
  name: string;
  operational_state: OperationalState;
  dry_mass_kg: number;
  propellant_mass_kg: number;
  battery_soc_pct: number;
  position_eci_m: [number, number, number];
  velocity_eci_mps: [number, number, number];
  semi_major_axis_m: number;
  eccentricity: number;
  inclination_rad: number;
  in_eclipse: boolean;
  is_synthetic: boolean;
}

export interface ConjunctionAlert {
  id: string;
  title: string;
  miss_distance_m: number;
  risk_level: 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';
  epoch: string;
}

export interface TickSnapshotMessage {
  type: string;
  simulation_epoch: string;
  tick_number: number;
  clock_state: 'STOPPED' | 'READY' | 'RUNNING' | 'PAUSED';
  time_acceleration: number;
  satellites: SatelliteTelemetry[];
  active_alerts: ConjunctionAlert[];
}
