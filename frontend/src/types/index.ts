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
  bus_voltage_v?: number;
  bus_current_a?: number;
  battery_temp_c?: number;
  avionics_temp_c?: number;
  solar_power_w?: number;
  downlink_rate_mbps?: number;
  comm_link_active?: boolean;
}

export interface SimulationEvent {
  id: string;
  epoch: string;
  event_type: string;
  title: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  satellite_id?: string | null;
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
  recent_events?: SimulationEvent[];
  debris?: any[];
}

export interface GroundStationItem {
  id: string;
  name: string;
  latitude_deg: number;
  longitude_deg: number;
  altitude_m: number;
  min_elevation_deg: number;
  is_active: boolean;
}

export interface PassRecord {
  satellite_id: string;
  satellite_name: string;
  ground_station_id: string;
  ground_station_name: string;
  aos_epoch: string;
  los_epoch: string;
  duration_seconds: number;
  duration_formatted: string;
  max_elevation_deg: number;
  min_range_km: number;
  status: string;
}

export interface ImageryItem {
  id: string;
  satellite_id: string;
  mission_id?: string | null;
  capture_epoch: string;
  resolution_m: number;
  fov_deg: number;
  spectral_band: string;
  target_name: string;
  target_lat: number;
  target_lon: number;
  image_url: string;
  cloud_cover_pct: number;
  is_synthetic: boolean;
  metadata_json?: Record<string, any>;
}

export interface ReportItem {
  id: string;
  report_type: string;
  title: string;
  generated_epoch: string;
  format: string;
  content: string;
  file_path?: string;
}

export interface ManeuverCandidate {
  id: string;
  maneuver_type: string;
  strategy?: string;
  description: string;
  delta_v_eci_mps: [number, number, number];
  delta_v_magnitude_mps: number;
  delta_v_total_mps?: number;
  burn_epoch: string;
  burn_duration_seconds: number;
  required_fuel_kg: number;
  propellant_remaining_kg: number;
  projected_miss_distance_m: number;
  miss_distance_gain_m: number;
  utility_score: number;
  is_feasible: boolean;
  is_approved: boolean;
  status: string;
  rejection_reason?: string | null;
  satellite_id?: string;
  satellite_name?: string;
}
