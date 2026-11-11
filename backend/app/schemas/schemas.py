from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Simulation Control Schemas
class SimulationControlRequest(BaseModel):
    action: str = Field(description="Action to perform: PLAY, PAUSE, STEP, RESET, STOP, SET_SPEED")
    rate: Optional[float] = Field(default=1.0, ge=0.1, le=100.0, description="Time acceleration multiplier")
    tick_size_seconds: Optional[float] = Field(default=1.0, ge=0.1, le=60.0)

class SimulationStatusResponse(BaseModel):
    simulation_id: str
    scenario_name: str
    clock_state: str
    current_epoch: datetime
    tick_number: int
    time_acceleration: float
    satellite_count: int

# Satellite Schemas
class CreateSatelliteRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    dry_mass_kg: float = Field(gt=0.0, description="SPEC-INV-001: Dry mass must be strictly positive")
    propellant_mass_kg: float = Field(ge=0.0, default=15.0, description="SPEC-INV-004: Propellant mass cannot be negative")
    semi_major_axis_km: float = Field(ge=6478.137, le=42164.0, default=6878.137, description="Orbit altitude between 100km and GEO")
    eccentricity: float = Field(ge=0.0, lt=0.95, default=0.001)
    inclination_deg: float = Field(ge=0.0, le=180.0, default=97.4)
    raan_deg: float = Field(ge=0.0, le=360.0, default=0.0)
    arg_periapsis_deg: float = Field(ge=0.0, le=360.0, default=0.0)
    true_anomaly_deg: float = Field(ge=0.0, le=360.0, default=0.0)

class SatelliteResponse(BaseModel):
    id: str
    name: str
    operational_state: str
    dry_mass_kg: float
    propellant_mass_kg: float
    battery_soc_pct: float
    position_eci_m: List[float]
    velocity_eci_mps: List[float]
    semi_major_axis_m: float
    eccentricity: float
    inclination_rad: float
    in_eclipse: bool
    is_synthetic: bool

# Orbital State Schemas
class OrbitalStateResponse(BaseModel):
    satellite_id: str
    epoch: datetime
    position_eci_m: List[float]
    velocity_eci_mps: List[float]
    semi_major_axis_m: float
    eccentricity: float
    inclination_deg: float
    true_anomaly_deg: float

# Telemetry Schemas
class TelemetryResponse(BaseModel):
    satellite_id: str
    epoch: datetime
    battery_soc_pct: float
    bus_voltage_v: float
    bus_current_a: float
    battery_temp_c: float
    solar_power_w: float
    subsystem_status: str
    in_eclipse: bool
    is_synthetic: bool

# Conjunction Schemas
class ConjunctionResponse(BaseModel):
    id: str
    primary_satellite_id: str
    primary_satellite_name: str
    secondary_object_id: str
    tca_epoch: datetime
    miss_distance_m: float
    rel_velocity_mps: float
    risk_level: str
    status: str

# Maneuver Schemas
class PlanManeuverRequest(BaseModel):
    satellite_id: str
    conjunction_event_id: Optional[str] = None
    delta_v_x_mps: float
    delta_v_y_mps: float
    delta_v_z_mps: float
    burn_epoch: datetime

class ManeuverPlanResponse(BaseModel):
    id: str
    satellite_id: str
    conjunction_event_id: Optional[str]
    delta_v_mps: List[float]
    burn_epoch: datetime
    required_fuel_kg: float
    status: str
    is_approved: bool

# Mission Task Schemas
class CreateTaskRequest(BaseModel):
    satellite_id: str
    name: str
    task_type: str = "EARTH_OBSERVATION"
    priority: int = Field(ge=1, le=5, default=3)
    duration_seconds: float = Field(gt=0.0, default=300.0)
    energy_cost_wh: float = Field(gt=0.0, default=15.0)
    earliest_start_epoch: datetime
    deadline_epoch: datetime

class MissionTaskResponse(BaseModel):
    id: str
    satellite_id: str
    name: str
    task_type: str
    priority: int
    duration_seconds: float
    energy_cost_wh: float
    earliest_start_epoch: datetime
    deadline_epoch: datetime
    scheduled_start_epoch: Optional[datetime]
    state: str

# Ground Station Schemas
class GroundStationResponse(BaseModel):
    id: str
    name: str
    latitude_deg: float
    longitude_deg: float
    altitude_m: float
    min_elevation_deg: float
    is_active: bool

class ContactWindowResponse(BaseModel):
    id: str
    ground_station_id: str
    ground_station_name: str
    satellite_id: str
    aos_epoch: datetime
    los_epoch: datetime
    max_elevation_deg: float
    status: str

# Real-Time WebSocket Telemetry Snapshot
class SatelliteTickSnapshot(BaseModel):
    satellite_id: str
    name: str
    operational_state: str
    position_eci_m: List[float]
    velocity_eci_mps: List[float]
    battery_soc_pct: float
    propellant_mass_kg: float
    in_eclipse: bool
    subsystem_status: str
    anomaly_score: float = 0.0
    bus_voltage_v: float = 28.0
    bus_current_a: float = 3.5
    battery_temp_c: float = 20.0
    avionics_temp_c: float = 30.0
    solar_power_w: float = 240.0
    downlink_rate_mbps: float = 12.5
    comm_link_active: bool = True

class SimulationEventMessage(BaseModel):
    id: str
    epoch: datetime
    event_type: str
    satellite_id: Optional[str] = None
    title: str
    severity: str = "INFO"

class TickSnapshotMessage(BaseModel):
    type: str = "SIMULATION_TICK_SNAPSHOT"
    simulation_epoch: datetime
    tick_number: int
    clock_state: str
    time_acceleration: float
    satellites: List[SatelliteTickSnapshot]
    active_alerts: List[Dict[str, Any]] = []
    recent_events: List[Dict[str, Any]] = []
    debris: List[Dict[str, Any]] = []
    scenario_state: Optional[Dict[str, Any]] = None
    formal_invariants: Optional[Dict[str, Any]] = None

# Update Satellite Request
class UpdateSatelliteRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    operational_state: Optional[str] = Field(None, description="ACTIVE, SAFE_HOLD, STANDBY, DECOMMISSIONED")
    dry_mass_kg: Optional[float] = Field(None, gt=0.0)
    propellant_mass_kg: Optional[float] = Field(None, ge=0.0)

# Fault Injection Schemas
class FaultInjectRequest(BaseModel):
    satellite_id: str
    fault_type: str = Field(description="SOLAR_ARRAY_DROP, BATTERY_DEGRADATION, THERMAL_RUNAWAY, VOLTAGE_SPIKE, COMM_FAILURE")
    severity: float = Field(default=1.0, ge=0.1, le=5.0)

class FaultRecordResponse(BaseModel):
    id: str
    satellite_id: str
    fault_type: str
    severity: float
    injected_epoch: datetime
    resolved_epoch: Optional[datetime] = None
    status: str
    details: Optional[Dict[str, Any]] = None

# Alert Schemas
class AlertItemResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    source_entity_id: Optional[str] = None
    epoch: datetime
    is_acknowledged: bool
    acknowledged_at: Optional[datetime] = None

# Report Schemas
class GenerateReportRequest(BaseModel):
    report_type: str = Field(default="MISSION_SUMMARY", description="MISSION_SUMMARY, TELEMETRY_LOG, CONJUNCTION_ASSESSMENT, FLEET_STATUS")
    title: str = Field(default="OrbitOS Operational Mission Report")
    format: str = Field(default="MARKDOWN", description="MARKDOWN, JSON")
    satellite_id: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    report_type: str
    title: str
    generated_epoch: datetime
    format: str
    content: str
    file_path: Optional[str] = None

# Imagery Schemas
class ImageryItemResponse(BaseModel):
    id: str
    satellite_id: str
    mission_id: Optional[str] = None
    capture_epoch: datetime
    resolution_m: float
    fov_deg: float
    spectral_band: str
    target_name: str
    target_lat: float
    target_lon: float
    image_url: str
    cloud_cover_pct: float
    is_synthetic: bool
    metadata_json: Optional[Dict[str, Any]] = None

class GenerateImageryRequest(BaseModel):
    satellite_id: str
    target_name: str = "Sahara Surface Target"
    target_lat: float = 24.5
    target_lon: float = 12.2
    spectral_band: str = "RGB"
    resolution_m: float = 1.5

