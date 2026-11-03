# 02 — OrbitOS Software Requirements Specification (SRS)

> **Document Status:** Baseline Approved  
> **Owner:** Senior Requirements Engineer & Systems Architect  
> **Target Path:** `docs/00-project-foundation/02-requirements-specification.md`  
> **Last Updated:** 2026-11-03  
> **Traceability Anchor:** `DOC-SRS-001`

---

## 1. Introduction and Scope

This Software Requirements Specification (SRS) defines the formal functional, non-functional, interface, and safety requirements for **OrbitOS — Autonomous Space Mission Management Simulator**. OrbitOS is an educational and research platform designed to execute locally on a single developer workstation or laptop.

Every requirement in this document possesses an immutable identifier, defined priority (MoSCoW: Must Have, Should Have, Could Have), dependencies, and objectively testable acceptance criteria.

---

> [!CAUTION]
> **SIMULATION-ONLY BOUNDARY (SAF-BND-001)**  
> All requirements must strictly enforce the simulation-only boundary. Under no circumstances shall OrbitOS include real-world spacecraft telecommand drivers, radio-frequency transmission protocols, or operational collision avoidance certifications.

---

## 2. Functional Requirements (FR)

### 2.1 Satellite Management & Subsystems (`FR-SAT`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-SAT-001** | Satellite Fleet Registration | System shall allow creation, update, retrieval, and deletion of virtual satellites with unique identifier, name, dry mass ($m_{\text{dry}} > 0\text{ kg}$), fuel mass ($m_f \ge 0\text{ kg}$), and initial Keplerian elements. | MUST | Fundamental operational entity. | None | Creating satellite with $m_{\text{dry}} \le 0$ returns HTTP 422; valid creation returns HTTP 201 with assigned UUID. | Unit Test (`TC-SAT-001`) |
| **FR-SAT-002** | Subsystem Telemetry Generation | System shall compute and log subsystem status (Power, Propulsion, Comms, Thermal, Payload) per simulation tick. | MUST | Enables telemetry monitoring and anomaly detection. | `FR-SIM-001` | Subsystem statuses must be one of `NOMINAL`, `DEGRADED`, `CRITICAL`, or `OFFLINE`. | Integration (`TC-SAT-002`) |
| **FR-SAT-003** | Battery State of Charge (SoC) | System shall model battery SoC ($0\% \le \text{SoC} \le 100\%$) based on solar panel generation in sunlight and continuous bus load. | MUST | Models critical resource constraint. | `FR-SAT-002`, `FR-ORB-001` | Battery SoC never exceeds $100\%$ nor drops below $0\%$; enters safe mode if $\text{SoC} < 15\%$. | Formal / Test (`TC-SAT-003`) |
| **FR-SAT-004** | Propellant Mass & Delta-V Tracking | System shall decrement propellant mass according to the Tsiolkovsky rocket equation for every executed maneuver burn: $\Delta m = m_0 (1 - e^{-\Delta v / I_{\text{sp}} g_0})$. | MUST | Prevents unphysical infinite-maneuver simulations. | `FR-SAT-001`, `FR-MAN-002` | Propellant mass monotonically decreases after burns; burn rejected if $\Delta m > m_f$. | Unit Test (`TC-SAT-004`) |
| **FR-SAT-005** | Satellite Finite State Machine | System shall enforce satellite lifecycle states: `CREATION`, `STANDBY`, `ACTIVE`, `MANEUVERING`, `SAFE_HOLD`, and `DECOMMISSIONED`. | MUST | Assures deterministic operational behavior. | `FR-SAT-001` | Transitions outside permitted state diagram are rejected with HTTP 409 conflict error. | Formal / Test (`TC-SAT-005`) |

---

### 2.2 Orbital Mechanics & Dynamics (`FR-ORB`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-ORB-001** | Two-Body Keplerian Propagation | System shall propagate satellite positions and velocities using Newtonian two-body dynamics with central Earth gravity ($\mu = 3.986004418 \times 10^{14}\text{ m}^3/\text{s}^2$). | MUST | Core physical simulation foundation. | `FR-SAT-001`, `FR-SIM-001` | Specific orbital energy $\mathcal{E} = \frac{v^2}{2} - \frac{\mu}{r}$ conserved within $10^{-6}\text{ J/kg}$ over 1 orbit in unperturbed mode. | Numerical (`TC-ORB-001`) |
| **FR-ORB-002** | Coordinate Frame Transformations | System shall convert Cartesian state vectors between ECI (GCRF/J2000) and ECEF (ITRF/WGS84) accounting for Earth rotation angle $\theta_{\text{ERA}}(t)$. | MUST | Essential for ground track and station visibility. | `FR-ORB-001` | Orthonormal transformation: $|\vec{r}_{\text{ECEF}}| = |\vec{r}_{\text{ECI}}|$ within floating-point tolerance ($10^{-5}\text{ m}$). | Unit Test (`TC-ORB-002`) |
| **FR-ORB-003** | Keplerian-to-Cartesian Conversion | System shall convert 6 classical Keplerian elements ($a, e, i, \Omega, \omega, \nu$) into ECI position $\vec{r}$ and velocity $\vec{v}$. | MUST | Standard input format for satellite orbits. | None | Round-trip conversion ($OE \to \text{Cartesian} \to OE$) reproduces original elements within $10^{-5}$ relative error. | Unit Test (`TC-ORB-003`) |
| **FR-ORB-004** | J2 Perturbation Propagation | System shall optionally model Earth's oblateness ($J_2 = 1.08263 \times 10^{-3}$) causing nodal regression ($\dot{\Omega}$) and apsidal precession ($\dot{\omega}$). | SHOULD | Higher physical realism for sun-synchronous orbits. | `FR-ORB-001` | Nodal precession rates match theoretical analytical values within $0.5\%$. | Numerical (`TC-ORB-004`) |

---

### 2.3 Simulation Engine (`FR-SIM`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-SIM-001** | Deterministic Discrete-Time Loop | System shall advance simulation time using discrete ticks $\Delta t \in [0.1\text{s}, 60\text{s}]$ with synchronized entity updates. | MUST | Guarantees repeatable experimental outcomes. | None | Monotonically increasing simulation timestamp $t_{k+1} = t_k + \Delta t$; zero clock jitter across runs. | Unit Test (`TC-SIM-001`) |
| **FR-SIM-002** | Clock State Management | System shall support `PAUSE`, `PLAY`, `FAST_FORWARD` (up to $100\times$), `STEP`, and `RESET` operations via REST and WebSockets. | MUST | Fundamental user control during simulation scenarios. | `FR-SIM-001` | Pausing halts clock immediately; stepping executes exactly 1 tick; resetting restores $t=t_0$ state. | Integration (`TC-SIM-002`) |
| **FR-SIM-003** | Seeded Pseudorandom Replay | System shall accept an integer seed for random event generators (e.g., sensor noise, link drops) to ensure 100% reproducible execution. | MUST | Critical for scientific and grading reproducibility. | None | Identical seed and input configuration produces identical SHA-256 telemetry hash. | Test (`TC-SIM-003`) |

---

### 2.4 Conjunction & Collision Analysis (`FR-COL`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-COL-001** | Conjunction Screening & TCA | System shall screen all satellite pairs for close approaches within a prediction horizon $H \le 72\text{ hours}$ and compute Time of Closest Approach ($t_{\text{TCA}}$). | MUST | Detects simulated collision threats. | `FR-ORB-001` | Computes $t_{\text{TCA}}$ where relative velocity $\dot{\vec{r}}_{\text{rel}} \cdot \vec{r}_{\text{rel}} = 0$; logs event if miss distance $< d_{\text{threshold}}$. | Integration (`TC-COL-001`) |
| **FR-COL-002** | Risk Level Classification | System shall categorize conjunctions into `INFO` ($> 10\text{ km}$), `WATCH` ($5\text{--}10\text{ km}$), `WARNING` ($1\text{--}5\text{ km}$), and `CRITICAL` ($< 1\text{ km}$). | MUST | Prioritizes operational responses. | `FR-COL-001` | Categorization matches defined geometric distance thresholds exactly. | Unit Test (`TC-COL-002`) |

---

### 2.5 Autonomous Maneuver Planning (`FR-MAN`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-MAN-001** | Avoidance Maneuver Candidate Plan | System shall generate candidate in-track ($\pm \Delta v_t$) and cross-track ($\pm \Delta v_c$) impulsive maneuvers to increase miss distance $> 5\text{ km}$. | MUST | Core autonomous intelligence capability. | `FR-COL-001`, `FR-SAT-004` | Generates $\ge 1$ candidate burn; candidate verifies that required fuel is available in budget. | Unit Test (`TC-MAN-001`) |
| **FR-MAN-002** | Simulated Maneuver Execution | System shall execute approved candidate maneuver at scheduled time $t_{\text{burn}}$, updating satellite orbital state and deducting propellant mass. | MUST | Models spacecraft trajectory modification. | `FR-MAN-001`, `FR-SIM-001` | Post-burn velocity $\vec{v}^+ = \vec{v}^- + \Delta \vec{v}$; propellant decreased by $\Delta m$; logged to audit trail. | Integration (`TC-MAN-002`) |
| **FR-MAN-003** | No-Action Recommendation | System shall evaluate whether doing no maneuver is optimal when risk is low or fuel cost compromises primary mission life. | SHOULD | Prevents unnecessary fuel expenditure. | `FR-MAN-001` | Proposes `NO_ACTION` option with explicit risk and delta-v cost justification. | Unit Test (`TC-MAN-003`) |

---

### 2.6 Mission Planning & Scheduling (`FR-MIS`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-MIS-001** | Mission Task Registration | System shall allow creation of mission tasks with target satellite, priority ($1\text{--}5$), required duration, energy cost, and earliest/latest execution windows. | MUST | Directs satellite payload activities. | `FR-SAT-001` | Rejects task if deadline $<$ start time or energy cost $>$ total battery capacity. | Unit Test (`TC-MIS-001`) |
| **FR-MIS-002** | Conflict-Free Task Scheduler | System shall schedule tasks across satellite constellation without overlapping payload activities or violating battery SoC limits. | SHOULD | Optimizes payload operations. | `FR-MIS-001`, `FR-SAT-003` | Output schedule contains zero concurrent tasks on the same satellite subsystem. | Integration (`TC-MIS-002`) |

---

### 2.7 Ground Stations & Communications (`FR-GND`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-GND-001** | Contact Window Calculation | System shall calculate line-of-sight visibility windows between satellites and ground stations for satellite elevation $\theta_{\text{elev}} \ge \theta_{\text{mask}}$ (default $10^\circ$). | MUST | Determines telemetry uplink/downlink availability. | `FR-ORB-002` | Calculates contact start, Acquisition of Signal (AOS), Loss of Signal (LOS), and maximum elevation. | Unit Test (`TC-GND-001`) |
| **FR-GND-002** | Telemetry Downlink During Pass | System shall stream buffered satellite telemetry to ground station during active contact window and halt downlink outside contact. | MUST | Models realistic comms constraints. | `FR-GND-001`, `FR-SAT-002` | Downlink throughput limited to configured link rate (default $1\text{ Mbps}$). | Integration (`TC-GND-002`) |

---

### 2.8 AI/ML Intelligence System (`FR-AIML`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-AIML-001** | Telemetry Anomaly Detection | System shall use Scikit-learn (Isolation Forest) to detect multi-dimensional telemetry anomalies (voltage, current, temperature). | SHOULD | Early warning for spacecraft health issues. | `FR-SAT-002` | Produces continuous anomaly score in $[0, 1]$ and binary flag when score exceeds threshold. | Unit Test (`TC-AIML-001`) |
| **FR-AIML-002** | Resource Consumption Forecasting | System shall forecast battery SoC and fuel consumption 24 hours ahead using linear/ridge regression. | COULD | Supports proactive mission planning. | `FR-SAT-003`, `FR-SAT-004` | Generates 24-hr predicted trajectory with upper and lower confidence intervals. | Unit Test (`TC-AIML-002`) |

---

### 2.9 External Data Integration (`FR-EXT`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-EXT-001** | NASA DONKI Space Weather Import | System shall import solar flare and geomagnetic storm records from NASA Open APIs with persistent caching. | SHOULD | Simulates space weather environmental effects. | None | Imported records include provider metadata, timestamp, and are flagged as `is_synthetic = false`. | Integration (`TC-EXT-001`) |
| **FR-EXT-002** | CelesTrak TLE Catalog Import | System shall import real satellite General Perturbations (GP) TLE data from CelesTrak. | SHOULD | Real-world reference orbit comparisons. | None | Validates TLE checksums; falls back to cached records if network connection is unavailable. | Integration (`TC-EXT-002`) |
| **FR-EXT-003** | NASA JPL Horizons Ephemeris Import | System shall query planetary and lunar state vectors from JPL Horizons for celestial reference. | COULD | Deepens gravitational reference modeling. | None | Parses JPL Horizons vectors into standardized ECI Cartesian vectors. | Integration (`TC-EXT-003`) |

---

### 2.10 Formal Verification System (`FR-FORM`)

| ID | Title | Description | Priority | Rationale | Dependencies | Acceptance Criteria | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-FORM-001** | VDM-SL Specification Validation | System shall validate all core safety invariants (`SPEC-INV-001` through `SPEC-INV-010`) using formal VDM-SL specifications. | MUST | Educational & architectural rigor. | All subsystems | VDMJ type-checker passes specification with zero syntax or typing errors. | Formal Tool (`TC-FORM-001`) |

---

## 3. Non-Functional Requirements (NFR)

### 3.1 Performance & Scalability (`NFR-PERF`)
- **NFR-PERF-001 (Tick Execution Latency):** The simulation engine shall calculate an unperturbed tick update for 20 satellites in $\le 50\text{ ms}$ on a standard 4-core developer laptop.
- **NFR-PERF-002 (WebSocket Telemetry Streaming):** Telemetry broadcast over WebSockets shall sustain $10\text{ Hz}$ update frequency with $< 20\text{ ms}$ serialization latency.
- **NFR-PERF-003 (3D Visualization Frame Rate):** The Three.js WebGL visualization shall maintain $\ge 45\text{ FPS}$ on integrated graphics during 20-satellite scenario playback.

### 3.2 Portability & Deployment (`NFR-PORT`)
- **NFR-PORT-001 (Single-Command Docker Deployment):** The entire application (FastAPI backend, PostgreSQL database, React frontend) must spin up completely with `docker compose up --build`.
- **NFR-PORT-002 (System Resource Footprint):** Total idle memory consumption of all Docker containers combined shall not exceed $2.5\text{ GB}$ RAM.

### 3.3 Security & Integrity (`NFR-SEC`)
- **NFR-SEC-001 (Input Validation):** All incoming API payloads must be validated with Pydantic v2 schemas; invalid data must return HTTP 422 with descriptive error messages.
- **NFR-SEC-002 (Secret Handling):** External API keys (e.g., NASA API key) must be injected strictly via environment variables; never checked into version control.

### 3.4 Accessibility & Usability (`NFR-ACC`)
- **NFR-ACC-001 (Contrast & Readability):** Frontend telemetry dashboard components must meet WCAG 2.1 Level AA color contrast ratios ($\ge 4.5:1$).
- **NFR-ACC-002 (2D Fallback View):** Frontend shall provide a lightweight 2D tabular dashboard for low-end hardware unable to render 3D WebGL scenes.

---

## 4. Prioritized MVP Acceptance Checklist

Before declaring the OrbitOS Core MVP complete, the following checklist must pass 100%:

- [ ] `FR-SAT-001`: Satellite fleet creation and persistence in PostgreSQL verified.
- [ ] `FR-SAT-003`: Battery SoC bounded in $[0, 100]\%$ under formal invariant.
- [ ] `FR-SAT-004`: Propellant mass monotonically decreases after burns; non-negative invariant enforced.
- [ ] `FR-ORB-001`: Two-body Keplerian propagation satisfies specific orbital energy conservation.
- [ ] `FR-ORB-002`: ECI to ECEF transformation accurately reflects Earth rotation angle.
- [ ] `FR-SIM-001`: Discrete time step clock is deterministic across seeded runs.
- [ ] `FR-COL-001`: Conjunction detection identifies close approach within $10\text{ km}$.
- [ ] `FR-MAN-001`: Avoidance maneuver plan generated with fuel verification.
- [ ] `FR-GND-001`: Ground station line-of-sight elevation calculation verified against analytical pass geometry.
- [ ] `SAF-BND-001`: No physical telecommand drivers or real hardware interfaces exist in repository.
- [ ] `NFR-PORT-001`: System initializes cleanly on a fresh laptop using Docker Compose.

