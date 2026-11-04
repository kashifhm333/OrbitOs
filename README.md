# OrbitOS — Autonomous Space Mission Management Simulator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-brightgreen.svg)](https://www.python.org/)
[![FastAPI: 0.115](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Three.js: R3F](https://img.shields.io/badge/Three.js-R3F-black.svg)](https://threejs.org/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-ML%20Intelligence-orange.svg)](https://scikit-learn.org/)
[![Alembic: Migrations](https://img.shields.io/badge/Alembic-Async%20DB%20Migrations-purple.svg)](https://alembic.sqlalchemy.org/)
[![Docker: Compose](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://www.docker.com/)

> **OrbitOS** is a production-grade, aerospace-grade autonomous space mission management and simulation platform. It runs on a standard developer workstation or laptop, modeling virtual satellite constellations, Newtonian Keplerian orbital dynamics, multi-subsystem telemetry, global ground station contact passes, automated orbital conjunction screening, autonomous collision avoidance maneuver planning, machine learning telemetry anomaly detection, hardware subsystem fault injection, synthetic Earth observation imagery, and automated mission reporting.

---

> [!CAUTION]
> **SIMULATION-ONLY SAFETY BOUNDARY (`SAF-BND-001`)**  
> OrbitOS is strictly a local simulation and research environment. It does **not** connect to real operational spacecraft, does **not** command physical flight hardware, does **not** interface with real satellite radio uplinks, and must **never** be cited as a certified operational collision avoidance or flight guidance system. All synthetic data is clearly flagged (`is_synthetic = True`).

---

## 1. System Transformation & OrbitTrack Aerospace Design System

OrbitOS has been transformed into a production-grade aerospace mission control application adhering to the **OrbitTrack** visual design system:

- **Aerospace Color Palette:** Deep space backgrounds (`#050B16`, `#071426`, `#091A30`), elevated panels (`#10243B`), primary cyan accents (`#00D5FF`), secondary flight blue (`#1677FF`), telemetry success emerald (`#00D69A`), hazard warning amber (`#FFB547`), and critical red (`#FF4D5E`).
- **Persistent Global Navigation:** 12 dedicated functional views accessible via the primary sidebar:
  1. **Dashboard:** Centerpiece 3D Earth globe, real-time subsystem telemetry, passes, orbital parameters, and event log.
  2. **Satellites:** Fleet inventory, orbital element configuration, mass budget, deployment modal, and lifecycle control.
  3. **Tracking:** 3D ECI/ECEF tracking viewport with sub-satellite latitude/longitude, altitude, speed, and target switching.
  4. **Imagery:** Synthetic Earth observation catalog, spectral band filter (RGB, NIR, Thermal IR), and vector SVG exporter.
  5. **Telemetry:** Multi-subsystem bus waveforms (voltage, current, power, temperatures) and historical query buffer.
  6. **Missions:** Earliest-Deadline-First task queue, task submission modal, energy feasibility check, and optimization trigger.
  7. **Conjunctions:** 3-tier collision screening sieve, close approach miss distance, collision probability ($P_c$), and Tsiolkovsky $\Delta v$ burns.
  8. **Ground Stations:** Global station registry, contact visibility matrix with azimuth/elevation, FSPL link budget, and station onboarding.
  9. **AI / ML Intelligence:** Unsupervised Isolation Forest anomaly detection, feature explainability, and 24-hour Ridge regression battery SoC forecast with confidence intervals.
  10. **Hardware Fault Injection:** Controlled anomaly injection studio (solar array drop, thermal runaway, voltage surge, battery degradation, RF loss) with FDIR verification.
  11. **Alerts Center:** Filterable hazard log, operator acknowledgment flow, severity tagging (Critical, Warning, Info), and audit trail.
  12. **Settings:** Simulation clock rate, 3D viewport particle density and layer configuration, and system safety isolation diagnostics.

---

## 2. System Architecture

```text
OrbitOS/
├── frontend/                     # React 18 + Three.js / React Three Fiber + TailwindCSS + Zustand
│   ├── src/
│   │   ├── components/           # Topbar, Sidebar, RightPanel, BottomStrip, 3D OrbitalCanvas
│   │   ├── features/             # 12 dedicated mission control page views
│   │   ├── store/                # Zustand simulation state store & WebSocket listeners
│   │   └── types/                # Strongly-typed aerospace schemas & telemetry models
├── backend/                      # FastAPI async REST API + WebSocket streaming
│   ├── app/
│   │   ├── api/routers/          # REST endpoints (telemetry, orbits, passes, imagery, faults, alerts, reports, ml...)
│   │   ├── astrodynamics/        # Kepler solver, ECI/ECEF/SEZ frames, RK4 integrator
│   │   ├── bus/                  # Electrical power (EPS), eclipse shadow, battery & thermal dynamics
│   │   ├── simulation/           # Stepped clock loop, discrete tick pipeline, event queue
│   │   ├── conjunction/          # 3-tier screening sieve, Brent's root-finder, TCA calculator
│   │   ├── maneuver/             # LVLH delta-v candidate generator, Tsiolkovsky fuel budgeting
│   │   ├── mission/              # Priority-Weighted Greedy EDF scheduler & dependency sort
│   │   ├── ground/               # Topocentric SEZ frames, AOS/LOS passes, RF FSPL link budget
│   │   ├── ml/                   # Isolation Forest anomaly detector, 24-hr resource forecaster
│   │   ├── external/             # Adapters for NASA DONKI, CelesTrak, NASA JPL Horizons
│   │   └── models/               # SQLAlchemy 2.0 async database entities (18 tables)
├── alembic/                      # Async Alembic database migrations environment
├── formal-specifications/        # Formal VDM-SL mathematical safety contracts
├── tests/                        # 46 Automated unit, integration, and property-based tests
├── data/seeds/                   # Static offline fallback datasets for external providers
├── docs/                         # Authoritative engineering specification suite
└── docker-compose.yml            # Multi-container production deployment definition
```

---

## 3. How to Run OrbitOS

OrbitOS supports both **native local development** and **Docker Compose** containerization.

### Prerequisites
- **Python:** Version `3.12` or higher
- **Node.js:** Version `18.0` or higher (Node `20+` recommended)
- **Docker & Docker Compose** (optional)

---

### Method A: Native Local Execution (Recommended for Fast Development)

#### Step 1: Backend Setup & Database Migrations
```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run Alembic async database migrations (creates 18 tables in orbitos.db)
alembic upgrade head

# Start FastAPI simulation server on port 8001
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

- **Backend API:** [http://localhost:8001](http://localhost:8001)
- **Interactive Swagger Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Health Check:** [http://localhost:8001/api/v1/health](http://localhost:8001/api/v1/health)

#### Step 2: Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

The mission control cockpit starts at **[http://localhost:3000](http://localhost:3000)** and automatically proxies API requests and WebSockets to the backend on port `8001`.

---

### Method B: Docker Compose Multi-Container Deployment

Run the complete multi-container stack with one command:
```bash
docker compose up --build
```

To run in detached background mode:
```bash
docker compose up -d
```

To stop containers:
```bash
docker compose down
```

---

### Step 3: Running the Automated Test Suite

Verify that all 46 unit, integration, and property-based tests pass:
```bash
source .venv/bin/activate
pytest tests/ -v
```

Build the frontend production bundle ($0$ TypeScript errors):
```bash
cd frontend
npm run build
```

---

## 4. API Reference Summary

OrbitOS exposes an aerospace REST API and real-time WebSockets:

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Simulation** | `/api/v1/simulations/control` | `POST` | Control simulation clock (`PLAY`, `PAUSE`, `STEP`, `RESET`, `SET_SPEED`) |
| **Simulation** | `/api/v1/simulations/status` | `GET` | Retrieve simulation epoch, tick number, acceleration, and state |
| **Satellites** | `/api/v1/satellites` | `GET`, `POST` | List all satellites or deploy a new spacecraft |
| **Satellites** | `/api/v1/satellites/{id}` | `GET`, `PUT`, `DELETE` | Inspect, update parameters, or decommission satellite |
| **Telemetry** | `/api/v1/telemetry/{id}/latest` | `GET` | Subsystem telemetry snapshot (power, thermal, attitude, RF) |
| **Telemetry** | `/api/v1/telemetry/{id}/history` | `GET` | Historical sliding buffer for waveform trend analysis |
| **Orbits** | `/api/v1/orbits/{id}` | `GET` | Keplerian orbital elements and propagated ECI state vector |
| **Orbits** | `/api/v1/orbits/{id}/trajectory`| `GET` | Interpolated 3D orbital trajectory spline coordinates |
| **Passes** | `/api/v1/passes/{id}` | `GET` | Calculated upcoming ground station contact passes over horizon |
| **Passes** | `/api/v1/passes/upcoming` | `GET` | Global fleet-wide upcoming ground passes schedule |
| **Imagery** | `/api/v1/imagery` | `GET` | Catalog of captured Earth observation images |
| **Imagery** | `/api/v1/imagery/generate` | `POST` | Trigger synthetic optical observation capture |
| **Imagery** | `/api/v1/imagery/{id}/download` | `GET` | Export captured imagery as synthetic vector SVG |
| **Faults** | `/api/v1/faults/inject` | `POST` | Inject controlled subsystem anomaly (solar drop, thermal runaway...) |
| **Faults** | `/api/v1/faults/clear/{id}` | `POST` | Clear active injected faults and return subsystem to nominal |
| **Faults** | `/api/v1/faults/active` | `GET` | Retrieve currently active faults across the constellation |
| **Alerts** | `/api/v1/alerts` | `GET` | Active system and conjunction hazard alerts |
| **Alerts** | `/api/v1/alerts/{id}/acknowledge`| `POST` | Operator acknowledgment workflow |
| **Reports** | `/api/v1/reports/generate` | `POST` | Generate formal markdown report (Mission, Telemetry, Conjunction) |
| **Reports** | `/api/v1/reports/{id}/download` | `GET` | Download generated operations report |
| **AI / ML** | `/api/v1/ml/anomaly/{id}` | `GET` | Isolation Forest anomaly score and feature explainability |
| **AI / ML** | `/api/v1/ml/forecast/{id}` | `GET` | 24-hour predictive SoC and propellant curves with 95% CIs |
| **Conjunctions**| `/api/conjunctions/screen` | `POST` | 3-tier collision screening against secondary debris objects |
| **Maneuvers** | `/api/maneuvers/candidates/{id}`| `GET` | Generate 4 LVLH impulsive delta-v evasion burn strategies |
| **Missions** | `/api/missions/tasks` | `GET`, `POST` | Submit mission tasks or retrieve scheduled queue |
| **Missions** | `/api/missions/optimize` | `POST` | Execute Priority-Weighted Greedy EDF optimization |
| **Ground** | `/api/ground-stations` | `GET`, `POST` | Ground station registry and onboarding |
| **Ground** | `/api/ground-stations/status` | `GET` | Real-time azimuth, elevation, and FSPL link budget status |
| **WebSockets** | `/ws/v1/simulation` | `WS` | Non-blocking simulation tick broadcast stream |

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
