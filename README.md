# OrbitOS — Autonomous Space Mission Management Simulator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-brightgreen.svg)](https://www.python.org/)
[![FastAPI: 0.115](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Three.js: R3F](https://img.shields.io/badge/Three.js-R3F-black.svg)](https://threejs.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-ML%20Intelligence-orange.svg)](https://scikit-learn.org/)
[![Docker: Compose](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://www.docker.com/)

> **OrbitOS** is an educational and research-oriented autonomous space mission management simulator. It runs entirely on a standard developer workstation or laptop, modeling virtual satellite constellations, Newtonian Keplerian orbital dynamics, multi-subsystem telemetry, global ground station contact passes, automated orbital conjunction screening, autonomous collision avoidance maneuver planning, and machine learning telemetry anomaly detection.

---

> [!CAUTION]
> **SIMULATION-ONLY SAFETY BOUNDARY (`SAF-BND-001`)**  
> OrbitOS is strictly a local simulation and research environment. It does **not** connect to real operational spacecraft, does **not** command physical flight hardware, does **not** interface with real satellite radio uplinks, and must **never** be cited as a certified operational collision avoidance or flight guidance system. All synthetic data is clearly flagged (`is_synthetic = True`).

---

## 1. Problem Statement: Which Problem Does OrbitOS Solve?

The modern orbital environment is experiencing an unprecedented surge in satellite deployments. With the advent of commercial mega-constellations (Starlink, OneWeb, Project Kuiper) and over 36,000 tracked pieces of orbital space debris larger than 10 cm, **satellite fleet management has become too complex for manual human piloting alone**.

However, learning or researching modern autonomous satellite fleet operations faces several critical barriers:
1. **Proprietary & Classified Software:** Real-world Flight Dynamics Systems (FDS) and Space Situational Awareness (SSA) tools are tightly guarded, export-controlled, or prohibitively expensive for students, researchers, and software engineers.
2. **Physics vs. Operations Disconnect:** Standard academic simulators either focus solely on pure astrodynamic physics (e.g., differential equation orbital integrators) with zero spacecraft subsystem modeling, or on high-level scheduling without real physics.
3. **Heavyweight Infrastructure:** Existing aerospace suites require dedicated clusters, cloud contracts, or physical Software Defined Radios (SDR), preventing zero-setup local research on personal laptops.
4. **Lack of Explainable Autonomy:** Black-box autonomous algorithms often fail to provide transparent reasoning when rescheduling tasks or staging evasive maneuvers.

### How OrbitOS Solves These Challenges

OrbitOS bridges this gap by providing an **integrated, fully open-source, reproducible simulation ecosystem** that runs on a single computer:

- **Unified Multi-Domain Modeling:** Integrates orbital mechanics (Keplerian analytical propagation and RK4 numerical integration with $J_2$ oblateness perturbations), electrical power dynamics (solar array generation, battery charging/discharging, eclipse geometry), and thermal envelopes.
- **Automated Space Traffic Management (STM):** Implements a 3-tier hierarchical conjunction screening sieve to detect close encounters ($d_{\text{miss}} < 5\text{ km}$) and automatically generates, ranks, and executes delta-v ($\Delta v$) evasion burns using the Tsiolkovsky rocket equation.
- **Constraint-Driven Mission Scheduling:** Deploys a Priority-Weighted Greedy Earliest-Deadline-First (EDF) scheduler that handles task dependencies (DAG), battery depth-of-discharge constraints, and priority preemption for emergency burns.
- **Offline-First Resilience:** Ingests live space weather (NASA DONKI), satellite elements (CelesTrak GP/TLE), and celestial ephemeris (NASA JPL Horizons) when online, while seamlessly falling back to bundled static seeds when offline.
- **AI/ML Telemetry Intelligence:** Deploys lightweight Scikit-learn Isolation Forest multivariate anomaly detectors and Ridge regression resource forecasters to diagnose sensor anomalies and predict 24-hour battery/propellant curves.
- **Formal Verification:** Enforces non-negotiable physical invariants ($0 \le \text{SoC} \le 100\%$, $m_{\text{fuel}} \ge 0$, positive dry mass) specified in formal VDM-SL and validated by automated Hypothesis property testing.

---

## 2. System Architecture

```text
OrbitOS/
├── frontend/                     # React 18 + Three.js / React Three Fiber + TailwindCSS + Zustand
│   ├── src/
│   │   ├── components/
│   │   │   ├── visualization/    # 3D Earth globe, Keplerian orbit tracks, satellite meshes
│   │   │   ├── panels/           # Fleet, Telemetry, Conjunctions, Missions, Ground, AI/ML
│   │   │   └── common/           # Mission control header, clock controls, system status
│   │   └── store/                # Zustand real-time simulation state & WebSocket listeners
├── backend/                      # FastAPI async REST API + WebSocket streaming
│   ├── app/
│   │   ├── astrodynamics/        # Kepler solver, ECI/ECEF/SEZ frames, RK4 integrator
│   │   ├── bus/                  # Electrical power (EPS), eclipse shadow, battery dynamics
│   │   ├── simulation/           # Stepped clock loop, discrete tick pipeline, event queue
│   │   ├── conjunction/          # 3-tier screening sieve, Brent's root-finder, TCA calculator
│   │   ├── maneuver/             # LVLH delta-v candidate generator, Tsiolkovsky fuel budgeting
│   │   ├── mission/              # Priority-Weighted Greedy EDF scheduler & dependency sort
│   │   ├── ground/               # Topocentric SEZ frames, AOS/LOS passes, RF FSPL link budget
│   │   ├── ml/                   # Isolation Forest anomaly detector, 24-hr resource forecaster
│   │   ├── external/             # Adapters for NASA DONKI, CelesTrak, NASA JPL Horizons
│   │   └── models/               # SQLAlchemy 2.0 async database entities (SQLite/PostgreSQL)
├── formal-specifications/        # Formal VDM-SL mathematical safety contracts
├── tests/                        # 37 Automated unit, integration, and property-based tests
├── data/seeds/                   # Static offline fallback datasets for external providers
├── docs/                         # Authoritative 20-document engineering specification suite
└── docker-compose.yml            # Multi-container production deployment definition
```

---

## 3. How to Run the Project

OrbitOS supports both **native local development** (zero-overhead execution) and **Docker Compose** containerization.

### Prerequisites
- **Python:** Version `3.12` or higher
- **Node.js:** Version `18.0` or higher (Node `20+` or `22+` recommended)
- **Git** (optional, for version management)
- **Docker & Docker Compose** (optional, for containerized run)

---

### Method A: Native Local Execution (Recommended for Fast Development)

#### Step 1: Environment Setup
Clone or enter the project directory:
```bash
cd /path/to/orbit
```

Inspect or create your `.env` configuration file (a default `.env` and `.env.example` are pre-configured):
```ini
ENVIRONMENT=development
LOG_LEVEL=INFO

API_HOST=0.0.0.0
API_PORT=8001
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]

# Dual-database support: runs zero-setup SQLite out of the box
DATABASE_URL=sqlite+aiosqlite:///./orbitos.db

SIMULATION_TICK_SECONDS=1.0
DEFAULT_SCENARIO_SEED=42

# NASA Open API Key (demo key or user key)
NASA_API_KEY=mCB7BzpD6WCzrJgfJgngMMtgmBmFWhbHCdp8WkJg
CELESTRAK_CACHE_HOURS=24
HORIZONS_CACHE_DAYS=7
```

#### Step 2: Set Up and Run the Python Backend
Create a virtual environment and install backend dependencies:
```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI simulation server
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
The backend initializes the SQLite database schema automatically and starts the simulation engine.  
- **Backend API:** [http://localhost:8001](http://localhost:8001)
- **Swagger Documentation:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Health Check:** [http://localhost:8001/healthz](http://localhost:8001/healthz)

#### Step 3: Set Up and Run the Frontend Dashboard
Open a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The dashboard starts on **[http://localhost:3000](http://localhost:3000)** and automatically proxies `/api` and `/ws` requests to the backend on port `8001`.

---

### Method B: Single-Command Docker Compose

If you have Docker and Docker Compose installed, run the entire multi-container stack (PostgreSQL 16, FastAPI backend, and Nginx/React frontend) with one command:

```bash
docker compose up --build
```

To run in the background (detached mode):
```bash
docker compose up -d
```

To stop the containers:
```bash
docker compose down
```

---

### Step 4: Running the Automated Test Suite

Verify that all 37 unit, integration, and property-based tests pass:

```bash
source .venv/bin/activate
pytest tests/ -v
```

To build the frontend production assets without errors:
```bash
cd frontend
npm run build
```

---

## 4. How to Use OrbitOS (User Guide)

When you open **[http://localhost:3000](http://localhost:3000)**, you are presented with the Mission Control Cockpit:

```text
+----------------------------------------------------------------------------------------------------+
|  [ORBITOS v1.0]     [PLAY] [PAUSE] [STEP] [RESET]   [1x][5x][10x]   Epoch: 2026-11-04 12:00:00 UTC |
+-------------------------------------------------------------+--------------------------------------+
|                                                             |  [Fleet] [Telemetry] [Conjunctions]  |
|                                                             |  [Missions] [Ground] [AI/ML]         |
|                                                             |--------------------------------------|
|                     3D WebGL Viewport                       |                                      |
|                                                             |  Active Panel Content:               |
|            (Interactive Earth Globe + Orbits)               |  - Satellite State Cards             |
|                                                             |  - Live Subsystem Charts             |
|                  [Enable 2D Viewport]                       |  - Evasion Maneuver Buttons          |
|                                                             |  - Mission Task Optimizer            |
|                                                             |  - Pass Schedules (AOS/LOS)          |
|                                                             |  - Anomaly Score & Fault Injection   |
+-------------------------------------------------------------+--------------------------------------+
```

### 1. Controlling the Simulation Clock
Located in the center of the top navigation bar:
- **Play (`▶`):** Starts continuous real-time simulation clock advancement.
- **Pause (`⏸`):** Freezes the simulation clock at the current tick for in-depth inspection.
- **Step Forward (`⏭`):** Advances the simulation by exactly one discrete tick ($1.0\text{ s}$).
- **Reset (`↺`):** Reinitializes the simulation epoch back to default scenario conditions (`2026-11-04 12:00:00 UTC`).
- **Speed Multiplier:** Accelerate simulation time up to $10\times$ or $50\times$ to observe full 90-minute orbital periods in seconds.

### 2. Navigating the 3D Orbital Viewport
- **Rotate:** Click and drag left mouse button around the Earth globe.
- **Zoom:** Use mouse scroll wheel to zoom from Low Earth Orbit down to surface altitude.
- **Pan:** Right-click and drag to adjust camera center.
- **Select Satellite:** Click directly on any satellite mesh or orbit track spline in the 3D scene to focus and inspect its telemetry.
- **2D Mode Toggle:** Click `2D VIEW` in the upper-left overlay to disable WebGL rendering on low-power laptops or battery-saver mode.

### 3. Monitoring Fleet Health (`Fleet` Tab)
- Displays all virtual satellites currently in the constellation (`OrbitOS-Alpha`, `OrbitOS-Beta`, `OrbitOS-Gamma`).
- Shows real-time semi-major axis ($a$), altitude, eccentricity ($e$), inclination ($i$), battery State-of-Charge (SoC), and remaining chemical propellant mass ($m_{\text{fuel}}$).
- Identifies whether the spacecraft is in direct sunlight or Earth's cylindrical shadow (eclipse).

### 4. Deep Telemetry Diagnostics (`Telemetry` Tab)
- Detailed electrical power subsystem (EPS) telemetry: bus voltage ($28\text{ V}$ nominal), bus current, battery temperature ($^\circ\text{C}$), avionics temperature, and solar array output ($240\text{ W}$ in sunlight, $0\text{ W}$ in eclipse).
- Observes battery charge recovery when exiting eclipse and safe-hold transitions if battery drains below $15\%$.

### 5. Managing Close Encounters & Avoidance Burns (`Conjunctions` Tab)
- Click **"TRIGGER 3-TIER SCREENING"** to screen active satellites against secondary objects and orbital debris over a 24-hour lookahead horizon.
- Conjunctions are automatically categorized by miss distance:
  - `INFO`: $d_{\text{miss}} \ge 10\text{ km}$
  - `WATCH`: $5\text{ km} \le d_{\text{miss}} < 10\text{ km}$
  - `WARNING`: $1\text{ km} \le d_{\text{miss}} < 5\text{ km}$
  - `CRITICAL`: $d_{\text{miss}} < 1\text{ km}$
- Click **"EVALUATE MANEUVERS"** to generate 4 canonical candidate strategies:
  1. *In-Track Prograde ($+\Delta v_t$):* Arrives later at junction point.
  2. *In-Track Retrograde ($-\Delta v_t$):* Arrives earlier at junction point.
  3. *Cross-Track Normal ($+\Delta v_c$):* Lateral out-of-plane displacement.
  4. *No-Action:* Baseline reference.
- Review fuel expenditure computed via the Tsiolkovsky rocket equation.
- Click **"SIMULATED APPROVAL"** to arm the candidate, then **"EXECUTE BURN"** to apply the impulsive $\Delta \vec{v}$ to the satellite's state vector and deduct propellant mass.

### 6. Scheduling Mission Activities (`Missions` Tab)
- Submit mission payload tasks: Earth Observation Imaging, RF Surveillance, Data Downlinks, or Calibration.
- Configure priority (1 to 5), duration in seconds, and required energy cost in Watt-hours.
- Click **"OPTIMIZE (EDF)"** to run the priority-weighted greedy Earliest-Deadline-First optimization. The engine sorts task dependency DAGs, verifies battery depth-of-discharge constraints ($> 25\%$ SoC), and automatically preempts lower-priority activities for critical operations.

### 7. Tracking Ground Station Passes (`Ground` Tab)
- Monitors global tracking stations: **Svalbard Satellite Station** (`GS-SVAL`), **Singapore Earth Station** (`GS-SGP`), and **Santiago Tracking Station** (`GS-SCL`).
- Real-time indicator displays **`CARRIER LOCK`** when the satellite's elevation angle exceeds the horizon mask ($\theta_{\text{elev}} \ge 10^\circ$).
- Predicts upcoming contact passes over a 12-hour horizon, reporting Acquisition of Signal (AOS), Peak Elevation ($\theta_{\text{max}}$), Loss of Signal (LOS), and Free-Space Path Loss (FSPL) in decibels.

### 8. AI/ML Telemetry Intelligence & Fault Injection (`AI/ML` Tab)
- Real-time **Isolation Forest** gauge displays continuous anomaly confidence ($0\%$ to $100\%$).
- **Explainable Diagnostics:** Identifies the primary feature deviation driver (e.g. voltage drop, temperature spike, negative net power).
- **Synthetic Fault Injection Sandbox:**
  - Inject *Solar Array Degradation* (simulates micro-meteoroid impact reducing power by 40%).
  - Inject *Thermal Runaway* (simulates radiator failure adding $+15^\circ\text{C}$).
  - Inject *Voltage Spike* (simulates power bus surge).
  - Observe the ML model detect the anomaly within ticks, then click **"RESET NOMINAL"** to clear the fault.
- **Resource Forecaster:** Displays 24-hour predictive battery State-of-Charge and propellant curves with $95\%$ confidence bounds.

---

## 5. Technical Specifications & Mathematical Foundations

| Capability | Mathematical Formulation / Implementation | Location |
| :--- | :--- | :--- |
| **Keplerian Propagation** | Newton-Raphson iteration for eccentric anomaly $E$: $M = E - e \sin E$ | [`kepler_solver.py`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/astrodynamics/kepler_solver.py) |
| **Geodesy & Frames** | Bowring closed-form geodetic coordinates, Earth Rotation Angle $\theta_{\text{ERA}}$ | [`frames.py`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/astrodynamics/frames.py) |
| **Topocentric SEZ** | Observer South-East-Zenith horizon frame, elevation $\theta_{\text{elev}} = \arcsin(\rho_Z / \rho)$ | [`coordinates.py`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/ground/coordinates.py) |
| **Conjunction Screening** | 3-tier sieve: $O(1)$ altitude envelope $\to$ coarse mesh $\to$ Brent's minimization | [`screener.py`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/conjunction/screener.py) |
| **Maneuver Dynamics** | LVLH basis unit vectors $[\hat{r}, \hat{t}, \hat{c}]$, Tsiolkovsky $\Delta m = m_{\text{wet}}(1 - e^{-\Delta v / (I_{\text{sp}} g_0)})$ | [`planner.py`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/maneuver/planner.py) |
| **Task Optimization** | Priority-Weighted Greedy EDF ranking $\mathcal{R}(\tau) = w_p P - w_d (t_{\text{deadline}} - t) / H$ | [`scheduler.py`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/mission/scheduler.py) |
| **Machine Learning** | Scikit-learn Isolation Forest ensemble ($N_{\text{trees}} = 50$) on 8D rolling buffer | [`anomaly_detector.py`](file:///home/kashifhm333/Desktop/Project/orbit/backend/app/ml/anomaly_detector.py) |
| **Formal Specifications** | VDM-SL safety invariants: battery $[0, 100]\%$, mass $\ge 0$, simulation isolation | [`OrbitOS_SafetyCore.vdm`](file:///home/kashifhm333/Desktop/Project/orbit/formal-specifications/OrbitOS_SafetyCore.vdm) |

---

## 6. Authoritative Engineering Documentation Suite

OrbitOS is documented by 20 technical specifications and governance documents in [`docs/`](file:///home/kashifhm333/Desktop/Project/orbit/docs):

1. **Foundation:** [01 — Project Charter](file:///home/kashifhm333/Desktop/Project/orbit/docs/00-project-foundation/01-project-charter.md) | [02 — SRS](file:///home/kashifhm333/Desktop/Project/orbit/docs/00-project-foundation/02-requirements-specification.md) | [03 — Domain Glossary](file:///home/kashifhm333/Desktop/Project/orbit/docs/00-project-foundation/03-domain-glossary.md)
2. **System Design:** [04 — System Architecture](file:///home/kashifhm333/Desktop/Project/orbit/docs/01-system-design/04-system-architecture.md) | [05 — Orbital Mechanics](file:///home/kashifhm333/Desktop/Project/orbit/docs/01-system-design/05-orbital-mechanics-model.md) | [06 — Simulation Engine](file:///home/kashifhm333/Desktop/Project/orbit/docs/01-system-design/06-simulation-engine-design.md) | [07 — Satellite Lifecycle](file:///home/kashifhm333/Desktop/Project/orbit/docs/01-system-design/07-satellite-lifecycle-and-state-machines.md)
3. **Intelligence & Planning:** [08 — Collision Risk Analysis](file:///home/kashifhm333/Desktop/Project/orbit/docs/02-intelligence-and-planning/08-collision-detection-and-risk-analysis.md) | [09 — Autonomous Maneuver Planning](file:///home/kashifhm333/Desktop/Project/orbit/docs/02-intelligence-and-planning/09-autonomous-maneuver-planning.md) | [10 — Mission Planning](file:///home/kashifhm333/Desktop/Project/orbit/docs/02-intelligence-and-planning/10-mission-planning-and-optimization.md) | [11 — Ground Stations](file:///home/kashifhm333/Desktop/Project/orbit/docs/02-intelligence-and-planning/11-ground-station-and-communications.md) | [12 — AI/ML Intelligence](file:///home/kashifhm333/Desktop/Project/orbit/docs/02-intelligence-and-planning/12-ai-ml-intelligence-system.md)
4. **Engineering Contracts:** [13 — Formal Verification (VDM-SL)](file:///home/kashifhm333/Desktop/Project/orbit/docs/03-engineering-contracts/13-formal-specification-and-verification.md) | [14 — Database & API Contracts](file:///home/kashifhm333/Desktop/Project/orbit/docs/03-engineering-contracts/14-database-and-api-contracts.md) | [15 — Frontend & 3D Visualization](file:///home/kashifhm333/Desktop/Project/orbit/docs/03-engineering-contracts/15-frontend-and-visualization-design.md) | [16 — External Data Integration](file:///home/kashifhm333/Desktop/Project/orbit/docs/03-engineering-contracts/16-external-data-sources-and-api-integration.md)
5. **Quality & Operations:** [17 — Testing Strategy](file:///home/kashifhm333/Desktop/Project/orbit/docs/04-quality-and-operations/17-testing-and-validation-strategy.md) | [18 — Security & Safety](file:///home/kashifhm333/Desktop/Project/orbit/docs/04-quality-and-operations/18-security-and-safety-model.md) | [19 — Deployment & Operations](file:///home/kashifhm333/Desktop/Project/orbit/docs/04-quality-and-operations/19-deployment-and-operations.md)
6. **Roadmap & Register:** [20 — Implementation Roadmap](file:///home/kashifhm333/Desktop/Project/orbit/docs/20-implementation-roadmap.md) | [Implementation Status Register](file:///home/kashifhm333/Desktop/Project/orbit/docs/implementation-status.md)

---

## 7. License

OrbitOS is distributed under the terms of the **MIT License**. See [LICENSE](LICENSE) for details.
