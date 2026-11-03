# OrbitOS Documentation Traceability Matrix

> **Document Status:** Active Baseline  
> **Target Path:** `docs/DOCUMENTATION_TRACEABILITY.md`  
> **Last Updated:** 2026-11-03

This matrix establishes end-to-end traceability across the OrbitOS engineering lifecycle:
$$\text{Requirements (FR/NFR)} \longrightarrow \text{Architecture / Specs} \longrightarrow \text{Formal Properties (VDM-SL)} \longrightarrow \text{API / DB Contracts} \longrightarrow \text{Verification Tests} \longrightarrow \text{Roadmap Phase}$$

---

## 1. Traceability Mapping Table

| Requirement ID | Requirement Name | Subsystem / Design Doc | Formal Contract / Invariant ID | API Endpoint | Database Entity | Verification Test ID | Roadmap Phase |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-SAT-001** | Satellite Registry & Configuration | `07-satellite-lifecycle` | `SPEC-INV-001` (Unique ID, Mass > 0) | `POST /api/v1/satellites` | `satellites` | `TC-SAT-001` | Phase 1 |
| **FR-SAT-002** | Satellite Subsystem Health Modeling | `07-satellite-lifecycle` | `SPEC-INV-002` (State Enum Valid) | `GET /api/v1/satellites/{id}/health` | `satellite_telemetry` | `TC-SAT-002` | Phase 4 |
| **FR-SAT-003** | Battery & Power Balance Constraints| `07-satellite-lifecycle` | `SPEC-INV-003` ($0 \le \text{SoC} \le 100$) | `GET /api/v1/satellites/{id}/power` | `satellite_telemetry` | `TC-SAT-003` | Phase 4 |
| **FR-SAT-004** | Propellant Budget & Delta-V Tracking| `07-satellite-lifecycle` | `SPEC-INV-004` ($\text{Fuel} \ge 0$) | `GET /api/v1/satellites/{id}/propulsion` | `satellite_telemetry` | `TC-SAT-004` | Phase 4 |
| **FR-ORB-001** | Keplerian Two-Body State Propagation | `05-orbital-mechanics` | `SPEC-POST-001` (Conservation of Energy) | `GET /api/v1/satellites/{id}/orbit` | `orbital_states` | `TC-ORB-001` | Phase 2 |
| **FR-ORB-002** | ECI to ECEF Coordinate Transformation| `05-orbital-mechanics` | `SPEC-POST-002` (Orthonormal Transform) | `POST /api/v1/coords/eci-to-ecef` | N/A (Stateless) | `TC-ORB-002` | Phase 2 |
| **FR-SIM-001** | Deterministic Discrete Time Clock | `06-simulation-engine`| `SPEC-INV-005` (Monotonic Time Step) | `POST /api/v1/simulations/tick` | `simulation_runs` | `TC-SIM-001` | Phase 3 |
| **FR-SIM-002** | Simulation Pause, Resume & Reset | `06-simulation-engine`| `SPEC-PRE-001` (Valid Engine State) | `POST /api/v1/simulations/control` | `simulation_runs` | `TC-SIM-002` | Phase 3 |
| **FR-SIM-003** | Deterministic Random Seed Replay | `06-simulation-engine`| `SPEC-INV-006` (Identical State Hashes)| `POST /api/v1/simulations/reset` | `simulation_runs` | `TC-SIM-003` | Phase 3 |
| **FR-COL-001** | Conjunction Screening & Closest Appr.| `08-collision-detection`| `SPEC-POST-003` (Miss Distance $\ge 0$) | `GET /api/v1/conjunctions` | `conjunction_events` | `TC-COL-001` | Phase 8 |
| **FR-COL-002** | Collision Risk Level Classification | `08-collision-detection`| `SPEC-INV-007` (Risk Threshold Enum) | `GET /api/v1/conjunctions/{id}` | `conjunction_events` | `TC-COL-002` | Phase 8 |
| **FR-MAN-001** | Autonomous Avoidance Maneuver Plan | `09-autonomous-maneuver`| `SPEC-PRE-002` (Fuel Budget Sufficiency)| `POST /api/v1/maneuvers/plan` | `maneuver_plans` | `TC-MAN-001` | Phase 9 |
| **FR-MAN-002** | Simulated Maneuver Approval & Exec. | `09-autonomous-maneuver`| `SPEC-POST-004` (State Update Post-Burn)| `POST /api/v1/maneuvers/{id}/execute` | `maneuver_executions`| `TC-MAN-002` | Phase 9 |
| **FR-MIS-001** | Mission Task Definition & Priority | `10-mission-planning` | `SPEC-INV-008` (Deadline $\ge$ Start) | `POST /api/v1/missions` | `mission_tasks` | `TC-MIS-001` | Phase 7 |
| **FR-MIS-002** | Conflict-Free Mission Task Scheduler | `10-mission-planning` | `SPEC-POST-005` (Zero Overlapping Tasks)| `POST /api/v1/missions/schedule` | `mission_schedules` | `TC-MIS-002` | Phase 7 |
| **FR-GND-001** | Ground Station Visibility Windows | `11-ground-station` | `SPEC-POST-006` (Elevation $\ge \theta_{\text{min}}$) | `GET /api/v1/ground-stations/contacts`| `contact_windows` | `TC-GND-001` | Phase 6 |
| **FR-GND-002** | Simulated Uplink/Downlink & Outages | `11-ground-station` | `SPEC-INV-009` (Comms Lock Invariant) | `POST /api/v1/ground-stations/outages`| `comm_links` | `TC-GND-002` | Phase 6 |
| **FR-AIML-001**| Telemetry Anomaly Detection Engine | `12-ai-ml-intelligence`| `SPEC-POST-007` (Anomaly Score $\in [0, 1]$)| `POST /api/v1/intelligence/detect` | `telemetry_anomalies`| `TC-AIML-001` | Phase 10 |
| **FR-AIML-002**| Resource Consumption Forecasting | `12-ai-ml-intelligence`| `SPEC-POST-008` (Trend Bounds Valid) | `GET /api/v1/intelligence/forecast` | `resource_forecasts` | `TC-AIML-002` | Phase 10 |
| **FR-FORM-001**| VDM-SL Specification Validation | `13-formal-specification`| All `SPEC-*` | `GET /api/v1/formal/proof-status` | `verification_results`| `TC-FORM-001` | Phase 11 |
| **FR-EXT-001** | NASA DONKI Space Weather Import | `16-external-data-sources`| `SPEC-POST-009` (Provenanced Record) | `POST /api/v1/external/nasa/donki` | `external_records` | `TC-EXT-001` | Phase 5 |
| **FR-EXT-002** | CelesTrak TLE Satellite Catalog Import| `16-external-data-sources`| `SPEC-POST-010` (Checksum Validated) | `POST /api/v1/external/celestrak` | `external_records` | `TC-EXT-002` | Phase 5 |
| **FR-EXT-003** | NASA JPL Horizons Ephemeris Lookup | `16-external-data-sources`| `SPEC-POST-011` (Standard Frame Check) | `POST /api/v1/external/horizons` | `external_records` | `TC-EXT-003` | Phase 5 |
| **NFR-PERF-001**| Single Tick Simulation Latency < 50ms | `06-simulation-engine`| N/A | WebSocket `/ws/telemetry` | N/A | `TC-PERF-001` | Phase 3 |
| **NFR-PORT-001**| Complete Local Docker Compose Deploy | `19-deployment-and-ops` | N/A | N/A | N/A | `TC-DEPLOY-001`| Phase 0 |
| **SAF-BND-001**| Simulation-Only Isolation Guardrail | `18-security-and-safety`| `SPEC-INV-010` (`is_synthetic == True`)| All mutating endpoints | All entities | `TC-SAFE-001` | All Phases |

---

## 2. Verification Protocol

Every requirement must have a corresponding automated test case (`TC-*`) implemented during its designated roadmap phase. Acceptance gates in CI will verify that test coverage for all `FR-*` and `SAF-*` requirements is at 100%.

