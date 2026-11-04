# OrbitOS — Purpose, Problem Statement, System Mechanics & Visual Guide

> **Document Version:** 1.0.0  
> **Target Audience:** Space Systems Engineers, Software Architects, Researchers, Students, Flight Operations Personnel  
> **Platform Status:** Operational & Live at [http://localhost:3000](http://localhost:3000)

---

## 1. Executive Summary: What is OrbitOS?

**OrbitOS** is an autonomous space mission management and orbital simulation platform. It functions as a complete **digital mission control center** that runs on a standard developer workstation or laptop.

Imagine stepping into the flight control room at NASA Jet Propulsion Laboratory (JPL) or European Space Operations Centre (ESOC). On the main screens, you see real-time 3D Earth visualizations, orbital trajectories, satellite constellation positions, live electrical and thermal telemetry, global ground antenna tracking passes, automated collision warnings, and machine learning anomaly monitors.

OrbitOS provides this entire capability in software without requiring millions of dollars of proprietary aerospace tooling or physical satellite hardware.

```
+----------------------------------------------------------------------------------------------------+
|                                    ORBITOS MISSION CONTROL COCKPIT                                 |
+-------------------+----------------------------------------------------+---------------------------+
| PERSISTENT        | 3D ORBITAL WORKSPACE                               | REAL-TIME TELEMETRY       |
| NAVIGATION        |                                                    |                           |
|                   |  - 3D Interactive Earth Globe                      |  - EPS Bus Voltage (28V)  |
| [1] Dashboard     |  - Keplerian Trajectory Tracks                     |  - Solar Array Flux (W)   |
| [2] Satellites    |  - Satellite 3D Meshes                             |  - Battery SoC (0-100%)   |
| [3] Tracking      |  - 4 Global Ground Station Pins                    |  - Battery & Avionics Temp|
| [4] Imagery       |  - 150+ LEO Space Debris Cloud                     |  - RF Link Margin (dB)    |
| [5] Telemetry     |  - Direct Sunlight vs. Eclipse Shadow Detection    |  - Formal Invariants (10) |
| [6] Missions      +----------------------------------------------------+---------------------------+
| [7] Conjunctions  | UPCOMING GROUND PASSES | ORBITAL PARAMETERS | SIMULATION EVENT AUDIT STREAM    |
| [8] Ground Stns   | - Svalbard / Singapore | - Semi-Major Axis  | - Timestamped event logs  |
| [9] AI / ML       | - Santiago / Kourou    | - Eccentricity     | - Maneuvers executed      |
| [10] Faults       | - AOS / LOS Epochs     | - Inclination      | - Subsystem transitions   |
| [11] Alerts       | - Max Elevation Angle  | - RAAN & Anomaly   | - Collision warnings      |
| [12] Reports      | - Path Loss (FSPL)     | - Position & Speed | - Autonomous preemption   |
+-------------------+----------------------------------------------------+---------------------------+
```

---

## 2. Which Problem Does OrbitOS Solve?

The modern space industry is undergoing the most rapid expansion in human history. This revolution has created three acute problems that manual human operations and traditional aerospace software can no longer address.

```
                           THE THREE CRISES IN MODERN SPACE OPERATIONS
  
  1. THE ORBITAL HIGHWAY CRISIS       2. THE HUMAN BOTTLENECK CRISIS       3. THE ACCESS & RESEARCH GAP
  +-------------------------------+   +-------------------------------+   +-------------------------------+
  | > 10,000 active satellites    |   | Satellites have no pilot      |   | Traditional aerospace suites  |
  | > 36,000 pieces of debris     |   | Constellations cannot be      |   | cost $30,000+/seat (STK,      |
  | Close encounters happen daily |   | flown manually 24/7/365       |   | FreeFlyer, NASA FDS)          |
  | Miss distances under 1 km     |   | Emergency evasion burns       |   | Academic tools ignore physics |
  | Risk of catastrophic Kessler  |   | require instant autonomous    |   | or ignore hardware/operations |
  | cascade syndrome              |   | decision-making               |   | Zero unified open platform    |
  +-------------------------------+   +-------------------------------+   +-------------------------------+
```

### Crisis 1: The Orbital Highway Congestion (Space Traffic Management)
Over **10,000 active satellites** and more than **36,000 tracked pieces of orbital debris** larger than 10 cm are hurtling through Low Earth Orbit (LEO) at velocities exceeding **7.8 km/s (over 28,000 km/h)**. 
- At orbital velocity, a paint fleck can penetrate a satellite chassis; a bolt or spent rocket stage will obliterate it.
- Commercial mega-constellations (Starlink, OneWeb, Project Kuiper) add thousands of new spacecraft every year.
- **The Problem:** Operators receive hundreds of Conjunction Data Messages (CDMs) weekly. Identifying which ones represent genuine lethal collisions vs. safe near-misses is mathematically intensive and cannot be handled with manual spreadsheets.

### Crisis 2: The Human Operations Bottleneck
A satellite cannot be piloted like an aircraft:
- Earth rotates beneath the spacecraft while the orbit stays fixed in inertial space.
- A satellite only contacts a ground antenna for **5 to 12 minutes per 90-minute orbit**. The remaining 80 minutes are spent in radio blackout.
- During blackout, the spacecraft must autonomously regulate power, survive cold eclipse shadows, execute imaging missions, identify hardware faults, and avoid space debris.
- **The Problem:** Human ground crews cannot manually calculate impulsive delta-v burns, reschedule payload operations around battery limits, and diagnose telemetry anomalies in real time for hundreds of satellites simultaneously. Autonomous onboard intelligence is non-negotiable.

### Crisis 3: The Aerospace Education & Tooling Barrier
Historically, software that simulates both orbital mechanics and spacecraft operational subsystems has been:
1. **Classified or Export-Controlled (ITAR/EAR):** Inaccessible to students, developers, and international researchers.
2. **Prohibitively Expensive:** Proprietary commercial tools (such as Ansys STK or FreeFlyer) cost tens of thousands of dollars per license.
3. **Fragmented:** Classical astrodynamics tools simulate orbital trajectories but ignore batteries, solar panels, and communications. Conversely, scheduling simulators model tasks but ignore orbital geometry and line-of-sight physics.

---

## 3. How Does OrbitOS Solve These Problems?

OrbitOS solves these challenges through an **integrated, multi-domain autonomous architecture** that unites physics, spacecraft electrical engineering, automated space traffic management, and machine learning into a single runnable system:

```
+----------------------------------------------------------------------------------------------------+
|                                    ORBITOS MULTI-LAYER SOLUTION                                    |
+----------------------------------------------------------------------------------------------------+
| 1. Astrodynamics Physics Engine                                                                    |
|    - Newton-Raphson analytical Keplerian propagator (ECI & ECEF frames)                            |
|    - Runge-Kutta 4th-order (RK4) numerical integrator with Earth J2 oblateness perturbations       |
|    - Exact cylindrical shadow geometry for solar eclipse detection                                 |
+----------------------------------------------------------------------------------------------------+
| 2. Multi-Subsystem Engineering Simulator                                                           |
|    - Electrical Power Subsystem (EPS): Solar panel flux (240W), bus voltage (28V), current loads   |
|    - Battery State-of-Charge (SoC) integration with depth-of-discharge constraints                 |
|    - Coupled radiative/conductive thermal equilibrium (battery & avionics temperatures)            |
|    - RF Transponder & Topocentric SEZ visibility (Azimuth, Elevation, Free-Space Path Loss)        |
+----------------------------------------------------------------------------------------------------+
| 3. Automated 3-Tier Space Traffic Conjunction Screener                                            |
|    - Tier 1: O(1) apogee/perigee altitude band screening                                           |
|    - Tier 2: Coarse time-discretized distance mesh across secondary catalog objects               |
|    - Tier 3: Brent's root-finding numerical minimization for exact TCA and miss distance           |
+----------------------------------------------------------------------------------------------------+
| 4. Autonomous Collision Avoidance Maneuver Planner                                                 |
|    - LVLH frame impulsive candidate generation: Prograde (+dv), Retrograde (-dv), Normal (+dv)     |
|    - Exact fuel mass consumption calculation via Tsiolkovsky Rocket Equation                       |
|    - Simulated Flight Director approval & thruster burn execution                                  |
+----------------------------------------------------------------------------------------------------+
| 5. Priority-Weighted Greedy EDF Mission Task Scheduler                                             |
|    - Autonomous payload activity scheduling (Optical Imaging, RF Surveillance, Downlink)           |
|    - Directed Acyclic Graph (DAG) task dependency validation and circularity detection            |
|    - Battery energy feasibility constraints and emergency burn priority preemption                |
+----------------------------------------------------------------------------------------------------+
| 6. AI/ML Telemetry Intelligence & Fault Detection                                                  |
|    - Unsupervised Scikit-learn Isolation Forest ensemble on 8D sliding telemetry buffer            |
|    - Feature deviation explainability (identifying primary failure drivers in real time)           |
|    - 24-hour predictive Ridge regression resource forecasting with 95% confidence bounds           |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. How OrbitOS Works Under the Hood

OrbitOS operates on a **discrete-time stepped clock loop** ($1.0\text{ s}$ per tick, accelerated up to $50\times$). At each simulation tick, the engine advances through eight synchronized stages:

```
[TICK CLOCK] ---> [1. ASTRODYNAMICS] ---> [2. ECLIPSE & SUNLIGHT] ---> [3. POWER & THERMAL]
                         |                                                     |
                         v                                                     v
                  [4. GROUND PASSES] <--- [5. CONJUNCTION SIEVE] <--- [6. MISSION SCHEDULER]
                         |
                         v
                  [7. AI/ML ANOMALY] ---> [8. WEBSOCKET SNAPSHOT] ---> [REACT 3D COCKPIT]
```

### Stage 1: Keplerian Astrodynamics & Orbit Propagation
For each satellite, the simulation computes the mean anomaly $M(t) = M_0 + n(t - t_0)$, solves Kepler's transcendental equation for eccentric anomaly $E$ via Newton-Raphson iteration:
$$M = E - e \sin E \implies E_{n+1} = E_n - \frac{E_n - e \sin E_n - M}{1 - e \cos E_n}$$
From $E$, true anomaly $\nu$ is computed, yielding the position $\mathbf{r}_{\text{orb}}$ and velocity $\mathbf{v}_{\text{orb}}$ in the orbital plane. These are rotated into the Earth-Centered Inertial (ECI J2000) frame using the orbital inclination $i$, right ascension of the ascending node $\Omega$, and argument of perigee $\omega$.

### Stage 2: Solar Eclipse Geometry
To determine whether solar arrays are generating electricity, OrbitOS calculates the angle between the satellite vector $\mathbf{r}_{\text{sat}}$ and the Sun direction vector $\mathbf{r}_\odot$. If the satellite is behind the Earth ($\cos\psi < 0$) and within the cylindrical shadow cylinder ($d_\perp < R_\oplus = 6378.137\text{ km}$), the satellite is in **Umbra (Eclipse)**:
$$\text{Solar Flux} = 0\text{ W}, \quad \text{Arrays Inactive}$$
Otherwise, the spacecraft is in direct sunlight ($240\text{ W}$ nominal generation).

### Stage 3: Subsystem Electrical Power (EPS) & Thermal Dynamics
In sunlight, excess solar energy charges the onboard battery. In eclipse, the satellite bus draws current ($1.5\text{ A}$ to $8.5\text{ A}$) from the battery:
$$\frac{d(\text{SoC})}{dt} = \frac{P_{\text{solar}} - P_{\text{load}}}{V_{\text{bus}} \cdot C_{\text{batt}}}$$
Simultaneously, a coupled thermal balance equation models heat dissipation into deep space ($3\text{ K}$) vs. solar radiation absorption, maintaining battery and avionics temperatures within safe operational limits ($-10^\circ\text{C}$ to $+45^\circ\text{C}$).

### Stage 4: Topocentric Ground Station Contact
As the Earth rotates beneath the constellation, OrbitOS transforms satellite ECI vectors into topocentric South-East-Zenith (SEZ) coordinates centered at each ground tracking station:
$$\sin(\theta_{\text{elev}}) = \frac{\rho_Z}{\|\boldsymbol{\rho}\|}$$
When elevation exceeds the station horizon mask ($\theta_{\text{elev}} \ge 10^\circ$), radio contact is established (**Acquisition of Signal — AOS**), calculating Free-Space Path Loss (FSPL) in decibels until the spacecraft drops below the horizon (**Loss of Signal — LOS**).

### Stage 5: 3-Tier Collision Conjunction Screener
OrbitOS continuously screens all satellite orbits against cataloged debris objects using a hierarchical sieve:
1. **Tier 1 (Apogee/Perigee Sieve):** Checks if the radial altitude shells of two objects overlap ($r_{p,1} - 50\text{ km} \le r_{a,2}$). Objects in non-overlapping shells are discarded in $O(1)$ time.
2. **Tier 2 (Coarse Mesh):** Discretizes the 24-hour lookahead window into 60-second steps to locate the approximate close approach.
3. **Tier 3 (Brent's Minimization):** Uses Brent's root-finding numerical optimization to pinpoint the exact sub-second Time of Closest Approach (TCA) and minimum separation distance $d_{\text{miss}}$.

### Stage 6: Autonomous Collision Avoidance Maneuver Planning
If $d_{\text{miss}} < 5\text{ km}$, a hazard alert is generated. OrbitOS automatically synthesizes 4 candidate thruster burns in the Local Vertical Local Horizontal (LVLH) frame:
1. **In-Track Prograde ($+\Delta v_t$):** Raises orbital energy; satellite reaches TCA point later.
2. **In-Track Retrograde ($-\Delta v_t$):** Lowers orbital energy; satellite reaches TCA point earlier.
3. **Cross-Track Normal ($+\Delta v_c$):** Displaces the orbital plane laterally.
4. **No-Action Baseline:** Reference trajectory without burn.

The engine computes fuel mass consumption using the **Tsiolkovsky Rocket Equation**:
$$\Delta m = m_{\text{wet}} \left( 1 - \exp\left(-\frac{\Delta v}{I_{\text{sp}} g_0}\right) \right)$$
Upon operator approval, the impulsive $\Delta \mathbf{v}$ is applied to the satellite's Cartesian state vector, immediately updating the propagated trajectory.

### Stage 7: AI/ML Telemetry Anomaly Detection
An 8-dimensional rolling telemetry vector (voltage, current, battery SoC, temperatures, solar power, altitude, communications link) is evaluated every second by an unsupervised **Isolation Forest** model:
- Anomaly scores above $0.60$ trigger automated hazard alerts.
- A feature explainability matrix highlights which sensor caused the deviation (e.g., $90\%$ solar cell flux drop vs. thermal runaway).
- A Ridge regression model projects 24-hour predictive battery SoC curves with $95\%$ confidence bounds to forecast mission viability.

### Stage 8: Real-Time WebSocket Streaming & 3D Visualization
The entire updated simulation state is serialized and broadcast over WebSockets (`/ws/v1/simulation`) to the React 18 frontend, driving the 3D Three.js Earth globe, orbital track splines, and mission control telemetry dashboards at up to 50 Hz.

---

## 5. Visual Tour of OrbitOS (With Live Screenshots)

OrbitOS features 12 dedicated mission control pages built with a dark aerospace aesthetic (`#050B16` background, `#071426` sidebar, `#00D5FF` cyan highlights, `#00D69A` emerald status).

---

### View 1: Mission Control Center Dashboard
The central command workspace featuring the 3D WebGL Earth globe, satellite constellation positions, Keplerian trajectory splines, top telemetry strip, right subsystem tabs, and bottom data strip.

![Mission Control Dashboard](./docs/screenshots/01_dashboard.png)

- **3D Earth Globe:** Interactive camera rotation, zoom from LEO down to surface, day/night atmospheric rim, and equatorial reference ring.
- **Top Bar:** OrbitOS branding, active scenario, UTC simulation clock, real-time REST and WebSocket health pills, flight director role badge, and simulation-only safety banner.
- **Right Panel:** Subsystem telemetry tabs (**State, Attitude, Thermal, Power, Comm, Mission**) and formal VDM-SL safety invariants status (10/10 PASS).
- **Bottom Strip:** Upcoming ground passes, instantaneous orbital state vectors, and live timestamped event stream.

---

### View 2: Constellation Fleet Management
Provides comprehensive fleet inventory, orbital element configuration, dry and propellant mass budgets, satellite deployment, and decommissioning controls.

![Satellites Fleet View](./docs/screenshots/page_02_satellites.png)

- **Fleet Roster:** Displays active spacecraft (`OrbitOS-Alpha`, `OrbitOS-Beta`, `OrbitOS-Gamma`) with real-time status, altitude, and propellant remaining.
- **Mass Budgeting:** Models dry mass vs. chemical propellant mass for Tsiolkovsky delta-v capacity.
- **Deploy Satellite Modal:** Allows operators to inject new simulated satellites into custom orbital inclinations, altitudes, and eccentricities with input validation.

---

### View 3: 3D Geocentric Orbital Tracking HUD
A dedicated astrodynamic tracking display providing real-time sub-satellite geographic coordinates and orbital kinematics overlaying the 3D globe.

![Orbital Tracking View](./docs/screenshots/page_03_tracking.png)

- **Sub-Satellite Coordinates:** Calculates live geographic latitude ($^\circ\text{N/S}$) and longitude ($^\circ\text{E/W}$) directly from Cartesian ECI state vectors using Bowring's closed-form geodetic algorithm.
- **Kinematic HUD:** Displays orbital altitude ($h\text{ km}$), speed ($v\text{ km/s}$), and solar illumination state (Sunlit vs. Umbra Eclipse).
- **Target Switcher:** Rapidly switch tracking focus between constellation assets.

---

### View 4: Earth Observation Imagery Catalog
Simulates high-resolution satellite payload imaging passes, spectral band filtering, and synthetic vector SVG observation downloads.

![Earth Observation Imagery](./docs/screenshots/page_04_imagery.png)

- **Multi-Spectral Bands:** Supports **RGB** (Visible Natural Color), **NIR** (Near-Infrared Vegetation Index), **SWIR** (Short-Wave Infrared), and **SAR** (Synthetic Aperture Radar).
- **Capture Simulator:** Allows operators to target geographic coordinates (e.g., Gibraltar Maritime Passage, Suez Canal, Amazon Basin), configure spatial ground sampling distance (GSD), and generate synthetic imagery.
- **SVG Vector Exporter:** Downloadable synthetic imagery representations generated directly by the backend engine.

---

### View 5: Subsystem Telemetry & Historical Analysis
Detailed engineering bus diagnostics displaying live telemetry metrics, high-density historical waveform graphs, and sliding telemetry data tables.

![Telemetry View](./docs/screenshots/page_05_telemetry.png)

- **Real-Time Telemetry Cards:** Bus voltage ($28\text{ V}$ nominal), bus current, solar array power output, battery and avionics temperatures, and battery State-of-Charge.
- **Historical Waveforms:** SVG waveform trend lines displaying battery voltage curves through eclipse transitions.
- **Sliding History Buffer:** Chronological audit table recording recent telemetry ticks for post-flight engineering reviews.

---

### View 6: Autonomous Mission Planning & EDF Scheduler
Constraint-driven timeline scheduler using a Priority-Weighted Greedy Earliest-Deadline-First (EDF) algorithm.

![Missions View](./docs/screenshots/page_06_missions.png)

- **Task Submission:** Stage payload activities including Earth Observation Imaging, RF Surveillance, Downlink Dumps, and Orbital Maneuvers.
- **Constraint Feasibility:** Validates task energy costs (Watt-hours) against predicted battery Depth-of-Discharge (DoD) to ensure the satellite never drains below safety margins ($> 25\%$ SoC).
- **Automated Preemption:** Automatically preempts lower-priority background tasks when emergency collision avoidance burns are scheduled.

---

### View 7: Orbital Conjunction Screening & Maneuver Burn Planner
Autonomous Space Traffic Management (STM) engine that detects close encounters and plans evasive thruster burns.

![Conjunctions View](./docs/screenshots/page_07_conjunctions.png)

- **3-Tier Sieve Screening:** Evaluates active satellite trajectories against secondary orbital debris over a 24-hour lookahead horizon.
- **4 Evasion Candidates:** Calculates Prograde ($+\Delta v_t$), Retrograde ($-\Delta v_t$), Cross-Track Normal ($+\Delta v_c$), and No-Action options.
- **Tsiolkovsky Rocket Fuel Calculations:** Displays exact required propellant burn mass in kilograms and predicted miss-distance gain in meters.
- **Operator Burn Execution:** Two-step arming and execution workflow that updates the live Cartesian velocity vector and deducts chemical propellant.

---

### View 8: Global Tracking Ground Station Network
Monitors the global ground tracking antenna network with line-of-sight elevation tracking and radio frequency link margins.

![Ground Stations View](./docs/screenshots/page_08_ground.png)

- **Global Stations:** Tracks **Svalbard Satellite Station** (`GS-SVAL`, Norway), **Santiago Earth Station** (`GS-SCL`, Chile), **Singapore Ground Station** (`GS-SGP`), and **Kourou Tracking Station** (`GS-KOU`, French Guiana).
- **Real-Time Contact Matrix:** Displays live antenna elevation angle ($^\circ$), azimuth ($^\circ$), slant range ($\text{km}$), and Free-Space Path Loss (FSPL in $\text{dB}$).
- **Station Onboarding:** Form to register additional tracking facilities with custom coordinates and minimum elevation horizon masks ($\theta_{\text{mask}}$).

---

### View 9: AI / ML Telemetry Intelligence & Forecasting
Unsupervised machine learning anomaly detection combined with predictive resource regression.

![AI / ML Intelligence](./docs/screenshots/page_09_intelligence.png)

- **Isolation Forest Anomaly Gauge:** Continuous anomaly probability ($0\%$ to $100\%$) evaluated by an ensemble of 50 isolation trees over rolling 8D sensor telemetry.
- **Feature Explainability:** Identifies which sensor drove the anomaly detection (e.g., unexpected voltage drops, negative net power, or thermal spikes).
- **24-Hour Resource Forecaster:** Ridge regression trajectory projecting future battery SoC and propellant depletion with upper and lower 95% confidence intervals.

---

### View 10: Hardware Subsystem Fault Injection Studio
A controlled laboratory environment allowing flight controllers and students to inject realistic spacecraft anomalies and verify autonomous FDIR (Fault Detection, Isolation, and Recovery) algorithms.

![Fault Injection Studio](./docs/screenshots/page_10_faults.png)

- **Selectable Fault Modes:**
  1. *Solar Array Drop:* Simulates solar panel micro-meteoroid impact causing a $90\%$ power loss.
  2. *Thermal Excursion Runaway:* Simulates stuck heater relay or MLI insulation detachment ($> 65^\circ\text{C}$).
  3. *PDU Voltage Surge:* Simulates power distribution unit shunt regulator failure ($+6.4\text{V}$ spike).
  4. *Battery Degradation:* Simulates internal cell short circuit with accelerated capacity drain.
  5. *Comm Transponder Blackout:* Simulates S/X-band power amplifier thermal shutdown.
- **Severity Slider:** Dynamically scale anomaly severity from $1.0\times$ to $5.0\times$.
- **Telemetry Verification:** Real-time telemetry cards reflect the degradation instantly until the operator clicks `Clear Active Fault`.

---

### View 11: Mission Control Alerts & Hazard Center
Centralized flight director alarm console classifying operational risks by severity with acknowledgment workflows and an immutable audit trail.

![Alerts View](./docs/screenshots/page_11_alerts.png)

- **Severity Classification:** Categorizes hazards into **CRITICAL** (e.g. miss distance $< 1\text{ km}$, battery SoC $< 20\%$), **WARNING** ($1\text{ km} \le d_{\text{miss}} < 5\text{ km}$), and **INFO**.
- **Operator Acknowledgment:** Flight controllers can acknowledge hazards, silencing alarms and logging the operator timestamp.
- **Operational Audit Log:** Chronological record of all system events, state machine transitions, and operator interventions.

---

### View 12: Mission Reporting & Audit Export
Automated report generation facility producing standardized engineering documentation and mission summary records in Markdown format.

![Reports View](./docs/screenshots/page_12_reports.png)

- **Report Templates:**
  - *Full Mission Operations Summary:* Comprehensive constellation status, executed maneuvers, and completed payload tasks.
  - *Subsystem Telemetry Log:* Power, thermal, and battery health report.
  - *Orbital Conjunction Safety Review:* Detailed risk analysis of detected close encounters and avoidance burns.
  - *Constellation Fleet Health Audit:* Spacecraft longevity, remaining propellant, and subsystem degradation.
- **In-Browser Markdown Previewer:** Rendered preview with a single-click button to download `.md` files to disk.

---

### View 13: System Settings & Safety Boundary Diagnostics
Platform configuration panel for adjusting simulation step sizes, 3D viewport parameters, and verifying safety isolation.

![Settings View](./docs/screenshots/page_13_settings.png)

- **Simulation Clock Controls:** Configure base integration tick step ($1.0\text{ s}$ standard) and time acceleration.
- **Viewport Optimization:** Toggle 3D orbit track splines, ground station pins, orbital debris particles, and 3,000-particle celestial starfield.
- **Architecture Diagnostics:** Live verification of SQLAlchemy 2.0 / Alembic database persistence, WebSocket streaming status, Python 3.12 / NumPy / SciPy scientific engine, and simulation isolation mode (`SAF-BND-001`).

---

## 6. Practical Walkthrough: A Day in OrbitOS Mission Control

To understand how all these components work together in practice, consider the following real-world operational scenario executed in OrbitOS:

```
+----------------------------------------------------------------------------------------------------+
|                                    A REAL-TIME MISSION SCENARIO                                    |
+----------------------------------------------------------------------------------------------------+
| 1. CONJUNCTION ALERT: OrbitOS screens orbits and detects a dead rocket body passing within 850m   |
|    of "OrbitOS-Alpha". The Topbar flashes a CRITICAL hazard pill, and an alert is logged.          |
|                                                                                                    |
| 2. MANEUVER PLANNING: The flight controller opens the "Conjunctions" view. The engine evaluates   |
|    4 candidate burns using Tsiolkovsky's equation. The operator approves an In-Track Prograde      |
|    impulsive burn (+1.5 m/s dv, costing 0.174 kg of propellant).                                   |
|                                                                                                    |
| 3. BURN EXECUTION: The operator clicks "Execute Thruster Burn". The velocity vector updates,       |
|    semi-major axis increases by 2.8 km, and projected miss distance expands from 850m to 7.4 km.   |
|                                                                                                    |
| 4. AUTONOMOUS SCHEDULING: The "Missions" EDF scheduler recalculates the task timeline. Because     |
|    the avoidance burn consumed power and changed orbital geometry, a non-critical optical imaging  |
|    task is safely preempted to guarantee battery depth-of-discharge stays above 25%.               |
|                                                                                                    |
| 5. GROUND STATION PASS: "OrbitOS-Alpha" rises above the 10° horizon mask at Svalbard Tracking      |
|    Station. The Comm panel registers "CARRIER LOCK" at 18.4° elevation, and telemetry dumps        |
|    are downlinked with a 148 dB Free-Space Path Loss link margin.                                  |
|                                                                                                    |
| 6. AI/ML HEALTH VERIFICATION: The Isolation Forest anomaly detector scans the post-burn telemetry |
|    vector. Anomaly score remains nominal at 0.04 (Nominal Safe). Ridge regression confirms 24h     |
|    propellant reserves remain at 24.8 kg (ample margin for future mission life).                   |
|                                                                                                    |
| 7. FORMAL REPORTING: The flight director opens the "Reports" view and generates an "Orbital        |
|    Conjunction Safety Review" markdown file documenting the entire event for the audit record.    |
+----------------------------------------------------------------------------------------------------+
```

---

## 7. Key Technical Takeaways

1. **Integrated Multi-Domain Modeling:** OrbitOS is not just an orbit viewer or just a task scheduler; it connects orbital mechanics, electrical power, thermal dynamics, radio communications, collision avoidance, and machine learning into a single closed-loop ecosystem.
2. **Realistic Physics Without the Overhead:** Analytical Keplerian math and numerical RK4 physics run deterministically at 50 Hz on personal workstations with zero cloud dependencies.
3. **Formal Verification:** Enforces non-negotiable physical safety invariants ($0 \le \text{SoC} \le 100\%$, $m_{\text{fuel}} \ge 0$, positive dry mass, simulation isolation) validated via automated Hypothesis property testing.
4. **Zero-Setup Usability:** Runs with a single command via `./run.sh` or `docker compose up`, providing an intuitive aerospace mission control cockpit that makes complex space mechanics transparent, accessible, and interactive.

