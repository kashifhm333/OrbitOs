# OrbitOS Architecture Decision Records (ADR)

> **Document Status:** Active Baseline  
> **Repository:** OrbitOS Architecture Suite  
> **Last Updated:** 2026-11-03

This register captures all architectural and foundational technology decisions for OrbitOS. Changes to system architecture require documenting an ADR here before modifying design contracts.

---

## Index of Architecture Decisions

- [ADR-001: Modular Monolith Architecture over Distributed Microservices](#adr-001-modular-monolith-architecture-over-distributed-microservices)
- [ADR-002: Simplified Two-Body Dynamics with Keplerian Orbit Propagation for MVP](#adr-002-simplified-two-body-dynamics-with-keplerian-orbit-propagation-for-mvp)
- [ADR-003: FastAPI, Pydantic v2, and SQLAlchemy (PostgreSQL) for Core Backend Services](#adr-003-fastapi-pydantic-v2-and-sqlalchemy-postgresql-for-core-backend-services)
- [ADR-004: React 18, TypeScript, and Three.js / React Three Fiber for 3D Earth-Orbital Visualization](#adr-004-react-18-typescript-and-threejs--react-three-fiber-for-3d-earth-orbital-visualization)
- [ADR-005: VDM-SL for Formal Specification of Invariants and Critical Safety Contracts](#adr-005-vdm-sl-for-formal-specification-of-invariants-and-critical-safety-contracts)
- [ADR-006: Scikit-Learn with Synthetic Feature Engineering for Initial Telemetry ML](#adr-006-scikit-learn-with-synthetic-feature-engineering-for-initial-telemetry-ml)
- [ADR-007: Provider Adapter Pattern with Multi-Tier Caching for External Data Integrations](#adr-007-provider-adapter-pattern-with-multi-tier-caching-for-external-data-integrations)
- [ADR-008: Strict Simulation-Only Sandboxing and Command Isolation Boundary](#adr-008-strict-simulation-only-sandboxing-and-command-isolation-boundary)
- [ADR-009: Deterministic Discrete Simulation Clock with Seeded Pseudorandom Generators](#adr-009-deterministic-discrete-simulation-clock-with-seeded-pseudorandom-generators)
- [ADR-010: ECI (J2000) and ECEF (WGS84) Coordinate Frames via Skyfield and Astropy](#adr-010-eci-j2000-and-ecef-wgs84-coordinate-frames-via-skyfield-and-astropy)

---

### ADR-001: Modular Monolith Architecture over Distributed Microservices

- **Status:** Accepted
- **Context:** OrbitOS is targeted at researchers, students, and engineers developing and running missions on standard single-node development environments (laptops/workstations). Distributed microservices, service meshes, Kafka clusters, or multi-node Kubernetes clusters would create excessive CPU/memory overhead, brittle setup steps, and debugging complexity.
- **Decision:** Implement OrbitOS as a **Modular Monolith** in Python (FastAPI). Each domain (Simulation, Orbital Dynamics, Collision Analysis, Missions, Telemetry, Ground Stations, Formal Verification) is structured as an isolated internal module with clear programmatic interfaces, unified database transaction boundaries, and a single Docker Compose deployment profile.
- **Consequences:** 
  - *Positive:* Runs comfortably within 2–4 GB RAM on a standard laptop; zero network latency between simulation subsystems; trivial local testing; single unified database schema.
  - *Negative:* Horizontal scaling of specific compute-heavy simulation steps requires in-process multiprocessing rather than independent Kubernetes pod autoscaling.

---

### ADR-002: Simplified Two-Body Dynamics with Keplerian Orbit Propagation for MVP

- **Status:** Accepted
- **Context:** High-fidelity orbital propagators (e.g., SGP4/SDP4, full Cowell numerical integration with J2/J4 gravitational harmonics, solar radiation pressure, atmospheric drag models) require extensive numerical compute and specialized ephemeris management, which risks overwhelming early iterations.
- **Decision:** The Core MVP engine adopts a **deterministic Newtonian two-body Keplerian model** (unperturbed central body with standard Earth gravitational parameter $\mu = 3.986004418 \times 10^{14}\ \text{m}^3/\text{s}^2$) integrated with explicit numerical state vectors and analytical Kepler solving. Higher-order perturbations (J2 geopotential perturbation) and Skyfield/SGP4 TLE propagation are modularized as Phase 2 extensions.
- **Consequences:**
  - *Positive:* Fast, analytical baseline; mathematically predictable; ideal for formal method invariant proofs.
  - *Negative:* Long-horizon simulations (weeks/months) will drift from real orbital paths. Documentation must emphasize this educational simplification.

---

### ADR-003: FastAPI, Pydantic v2, and SQLAlchemy (PostgreSQL) for Core Backend Services

- **Status:** Accepted
- **Context:** OrbitOS requires high-performance asynchronous REST endpoints, bidirectional WebSockets for live telemetry streaming, rigid runtime data validation, and robust relational persistence.
- **Decision:** Standardize on **Python 3.11+, FastAPI, Pydantic v2**, and **SQLAlchemy 2.0 with PostgreSQL 16**. Alembic manages migrations. WebSockets stream simulation tick updates directly to frontend consumers.
- **Consequences:**
  - *Positive:* Native async/await event loops; high-speed serialization with Pydantic v2 core (Rust); comprehensive OpenAPI schema generation; robust relational integrity.
  - *Negative:* Heavy CPU-bound numerical propagation must be executed in separate thread/process pools or optimized C/NumPy extensions to prevent blocking the async event loop.

---

### ADR-004: React 18, TypeScript, and Three.js / React Three Fiber for 3D Earth-Orbital Visualization

- **Status:** Accepted
- **Context:** Visualizing orbits, satellite positions, ground stations, and conjunction geometries requires interactive, performant 3D WebGL rendering with a modern reactive component hierarchy.
- **Decision:** Build the frontend with **React 18, TypeScript, Vite, TailwindCSS**, and **Three.js powered by React Three Fiber (`@react-three/fiber`) and `@react-three/drei`**.
- **Consequences:**
  - *Positive:* Declarative scene graph modeling; smooth 60 FPS animation loops; seamless synchronization with React component state; strong typed contracts.
  - *Negative:* High WebGL resource usage on low-end integrated GPUs. A 2D fallback dashboard view must be supported for low-power hardware.

---

### ADR-005: VDM-SL for Formal Specification of Invariants and Critical Safety Contracts

- **Status:** Accepted
- **Context:** To fulfill the rigorous academic and formal methods objectives of OrbitOS, mission-critical subsystems (state machines, resource bounds, maneuver safety, ground contact eligibility) must have mathematical specifications beyond simple unit tests.
- **Decision:** Select **VDM-SL (Vienna Development Method — Specification Language)** as the authoritative formal specification standard. Core safety properties (e.g., fuel non-negativity, battery charge boundaries, deterministic state transitions) will be formally expressed with preconditions, postconditions, and explicit state invariants. VDMJ/Overture tooling is referenced for validation.
- **Consequences:**
  - *Positive:* Unambiguous semantic contracts; mathematically provable invariants; seamless translation into executable runtime assertions.
  - *Negative:* Learning curve for traditional software developers; requires automated mapping between VDM-SL specifications and executable pytest test suites.

---

### ADR-006: Scikit-Learn with Synthetic Feature Engineering for Initial Telemetry ML

- **Status:** Accepted
- **Context:** Anomaly detection on spacecraft telemetry (voltages, temperatures, battery levels) and resource consumption forecasting are needed without imposing deep learning GPU dependencies on laptop environments.
- **Decision:** Standardize on **Scikit-learn** using lightweight, interpretable models: Isolation Forests and One-Class SVM for telemetry anomaly detection, and Ridge/Random Forest regressors for fuel/battery consumption forecasting. Deep learning (PyTorch/TensorFlow) is classified as an optional advanced research extension.
- **Consequences:**
  - *Positive:* Ultra-fast training and inference on CPU; minimal dependency footprint; transparent model weights and feature importances.
  - *Negative:* Inability to capture complex raw sequential temporal features without careful sliding-window feature engineering.

---

### ADR-007: Provider Adapter Pattern with Multi-Tier Caching for External Data Integrations

- **Status:** Accepted
- **Context:** OrbitOS incorporates three external data services: NASA Open APIs (DONKI for space weather), CelesTrak (GP/TLE orbital elements), and NASA JPL Horizons (planetary/astronomical ephemeris). These services have rate limits, occasional network downtime, and varied data formats.
- **Decision:** Implement a **Provider Adapter Architecture** with:
  1. Abstract Base Adapter interfaces (`BaseDataProvider`).
  2. Multi-tier caching (in-memory LRU + persistent PostgreSQL storage).
  3. Strict provenance tracking (recording provider, source ID, retrieval epoch, validation checksum).
  4. Complete offline synthetic fallback mode allowing 100% functional local simulation without internet access.
- **Consequences:**
  - *Positive:* Resilient to external outages; respects third-party rate limits; zero external network reliance during automated testing or classroom labs.
  - *Negative:* Caching logic and schema normalization layers require rigorous testing and periodic cache invalidation policies.

---

### ADR-008: Strict Simulation-Only Sandboxing and Command Isolation Boundary

- **Status:** Accepted
- **Context:** OrbitOS simulates spacecraft command generation, maneuver burns, and autonomous recovery actions. There must be zero ambiguity or technical risk of interacting with real-world spacecraft or ground stations.
- **Decision:** The entire software architecture enforces a **Simulation-Only Isolation Boundary**:
  - No hardware interfaces, serial comms, or live telecommand uplink drivers exist in the codebase.
  - All "commands" are synthetic data structures persisted to the local PostgreSQL database and consumed by internal simulation state machines.
  - Synthetic simulation data and imported reference data are marked with an immutable boolean flag (`is_synthetic`).
- **Consequences:**
  - *Positive:* Complete safety; zero risk of liability or misuse.
  - *Negative:* None for an educational/research simulator.

---

### ADR-009: Deterministic Discrete Simulation Clock with Seeded Pseudorandom Generators

- **Status:** Accepted
- **Context:** To ensure reproducible research experiments, repeatable grading for students, and bug reproduction, consecutive runs with identical parameters must yield bitwise or numerically identical orbital histories.
- **Decision:** The simulation engine is driven by a **discrete, stepped simulation clock** with fixed configurable tick intervals ($\Delta t \in [0.1\text{s}, 60.0\text{s}]$) and centralized seeded pseudorandom number generators (using `numpy.random.default_rng(seed)`). Wall-clock time never directly drives internal state updates.
- **Consequences:**
  - *Positive:* 100% deterministic replay; pause/rewind/fast-forward capabilities; reproducible test suites.
  - *Negative:* Requires all asynchronous events to be buffered and evaluated at explicit tick boundaries.

---

### ADR-010: ECI (J2000) and ECEF (WGS84) Coordinate Frames via Skyfield and Astropy

- **Status:** Accepted
- **Context:** Ground station visibility depends on Earth rotation (ECEF), whereas Newtonian orbital dynamics are formulated in an inertial reference frame (ECI). Mixing frames leads to catastrophic navigation simulation errors.
- **Decision:** Standardize on **ECI (GCRF/J2000)** as the primary internal Cartesian state vector frame for orbital propagation, and **ECEF (ITRF/WGS84)** for Earth-fixed entities (ground stations, sub-satellite lat/long/alt). Transformations use IAU-standard Earth rotation angle routines through `astropy` and `skyfield`.
- **Consequences:**
  - *Positive:* Scientifically consistent; accurate ground-track and elevation angle calculations.
  - *Negative:* Requires explicit coordinate transform calls on every simulation tick where ground-satellite visibility is evaluated.

