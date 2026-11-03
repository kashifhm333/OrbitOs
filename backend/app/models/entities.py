import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, 
    Text, JSON, BigInteger, Index, CheckConstraint
)
from sqlalchemy.orm import relationship
from app.models.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scenario_name = Column(String(100), nullable=False)
    random_seed = Column(BigInteger, default=42, nullable=False)
    start_epoch = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    current_epoch = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    tick_size_seconds = Column(Float, default=1.0, nullable=False)
    clock_state = Column(String(20), default="STOPPED", nullable=False)
    time_acceleration = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    satellites = relationship("Satellite", back_populates="simulation", cascade="all, delete-orphan")


class Satellite(Base):
    __tablename__ = "satellites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    simulation_run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    norad_id = Column(Integer, nullable=True)
    dry_mass_kg = Column(Float, nullable=False)
    propellant_mass_kg = Column(Float, nullable=False)
    operational_state = Column(String(30), default="STANDBY", nullable=False)
    is_synthetic = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint("dry_mass_kg > 0.0", name="check_dry_mass_positive"),
        CheckConstraint("propellant_mass_kg >= 0.0", name="check_propellant_non_negative"),
        Index("idx_satellites_sim_run", "simulation_run_id"),
    )

    simulation = relationship("SimulationRun", back_populates="satellites")
    orbital_states = relationship("OrbitalState", back_populates="satellite", cascade="all, delete-orphan")
    telemetry_records = relationship("SatelliteTelemetry", back_populates="satellite", cascade="all, delete-orphan")
    maneuver_plans = relationship("ManeuverPlan", back_populates="satellite", cascade="all, delete-orphan")
    mission_tasks = relationship("MissionTask", back_populates="satellite", cascade="all, delete-orphan")


class OrbitalState(Base):
    __tablename__ = "orbital_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    satellite_id = Column(String(36), ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False)
    epoch = Column(DateTime(timezone=True), nullable=False)
    pos_x_m = Column(Float, nullable=False)
    pos_y_m = Column(Float, nullable=False)
    pos_z_m = Column(Float, nullable=False)
    vel_x_mps = Column(Float, nullable=False)
    vel_y_mps = Column(Float, nullable=False)
    vel_z_mps = Column(Float, nullable=False)
    semi_major_axis_m = Column(Float, nullable=False)
    eccentricity = Column(Float, nullable=False)
    inclination_rad = Column(Float, nullable=False)
    raan_rad = Column(Float, nullable=False)
    arg_periapsis_rad = Column(Float, nullable=False)
    true_anomaly_rad = Column(Float, nullable=False)

    __table_args__ = (
        Index("idx_orbital_states_sat_epoch", "satellite_id", "epoch"),
    )

    satellite = relationship("Satellite", back_populates="orbital_states")


class SatelliteTelemetry(Base):
    __tablename__ = "satellite_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    satellite_id = Column(String(36), ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False)
    epoch = Column(DateTime(timezone=True), nullable=False)
    battery_soc_pct = Column(Float, nullable=False)
    bus_voltage_v = Column(Float, default=28.0, nullable=False)
    bus_current_a = Column(Float, default=1.6, nullable=False)
    battery_temp_c = Column(Float, default=20.0, nullable=False)
    solar_power_w = Column(Float, default=0.0, nullable=False)
    subsystem_status = Column(String(30), default="NOMINAL", nullable=False)
    in_eclipse = Column(Boolean, default=False, nullable=False)
    is_synthetic = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        CheckConstraint("battery_soc_pct >= 0.0 AND battery_soc_pct <= 100.0", name="check_battery_soc_bounds"),
        Index("idx_telemetry_sat_epoch", "satellite_id", "epoch"),
    )

    satellite = relationship("Satellite", back_populates="telemetry_records")


class ConjunctionEvent(Base):
    __tablename__ = "conjunction_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    primary_satellite_id = Column(String(36), ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False)
    secondary_object_id = Column(String(100), nullable=False)
    tca_epoch = Column(DateTime(timezone=True), nullable=False)
    miss_distance_m = Column(Float, nullable=False)
    rel_velocity_mps = Column(Float, nullable=False)
    risk_level = Column(String(20), default="INFO", nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_conjunction_sat_tca", "primary_satellite_id", "tca_epoch"),
    )


class ManeuverPlan(Base):
    __tablename__ = "maneuver_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    satellite_id = Column(String(36), ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False)
    conjunction_event_id = Column(String(36), nullable=True)
    delta_v_x_mps = Column(Float, default=0.0, nullable=False)
    delta_v_y_mps = Column(Float, default=0.0, nullable=False)
    delta_v_z_mps = Column(Float, default=0.0, nullable=False)
    burn_epoch = Column(DateTime(timezone=True), nullable=False)
    required_fuel_kg = Column(Float, nullable=False)
    status = Column(String(20), default="PLANNED", nullable=False)
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    satellite = relationship("Satellite", back_populates="maneuver_plans")


class ManeuverExecution(Base):
    __tablename__ = "maneuver_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    maneuver_plan_id = Column(String(36), nullable=False)
    satellite_id = Column(String(36), nullable=False)
    execution_epoch = Column(DateTime(timezone=True), nullable=False)
    actual_delta_v_mps = Column(Float, nullable=False)
    fuel_consumed_kg = Column(Float, nullable=False)
    post_burn_semi_major_axis_m = Column(Float, nullable=False)
    audit_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class MissionTask(Base):
    __tablename__ = "mission_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    satellite_id = Column(String(36), ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    task_type = Column(String(40), default="EARTH_OBSERVATION", nullable=False)
    priority = Column(Integer, default=3, nullable=False)
    duration_seconds = Column(Float, default=300.0, nullable=False)
    energy_cost_wh = Column(Float, default=15.0, nullable=False)
    earliest_start_epoch = Column(DateTime(timezone=True), nullable=False)
    deadline_epoch = Column(DateTime(timezone=True), nullable=False)
    scheduled_start_epoch = Column(DateTime(timezone=True), nullable=True)
    state = Column(String(20), default="SUBMITTED", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    satellite = relationship("Satellite", back_populates="mission_tasks")


class GroundStation(Base):
    __tablename__ = "ground_stations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    latitude_deg = Column(Float, nullable=False)
    longitude_deg = Column(Float, nullable=False)
    altitude_m = Column(Float, default=0.0, nullable=False)
    min_elevation_deg = Column(Float, default=10.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class ContactWindow(Base):
    __tablename__ = "contact_windows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ground_station_id = Column(String(36), ForeignKey("ground_stations.id", ondelete="CASCADE"), nullable=False)
    satellite_id = Column(String(36), ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False)
    aos_epoch = Column(DateTime(timezone=True), nullable=False)
    los_epoch = Column(DateTime(timezone=True), nullable=False)
    max_elevation_deg = Column(Float, nullable=False)
    bytes_downlinked = Column(BigInteger, default=0, nullable=False)
    status = Column(String(20), default="PREDICTED", nullable=False)


class TelemetryAnomaly(Base):
    __tablename__ = "telemetry_anomalies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    satellite_id = Column(String(36), ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False)
    epoch = Column(DateTime(timezone=True), nullable=False)
    anomaly_score = Column(Float, nullable=False)
    primary_feature = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)
    status = Column(String(20), default="FLAGGED", nullable=False)


class ExternalRecord(Base):
    __tablename__ = "external_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(50), nullable=False)
    source_identifier = Column(String(100), nullable=False)
    retrieval_epoch = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    data_format = Column(String(20), default="JSON", nullable=False)
    raw_payload = Column(JSON, nullable=False)
    validation_checksum = Column(String(64), nullable=False)
    is_synthetic = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("idx_ext_provider_source", "provider", "source_identifier"),
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    epoch = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    actor = Column(String(50), default="SIMULATION_ENGINE", nullable=False)
    event_type = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)
    severity = Column(String(20), default="INFO", nullable=False)

