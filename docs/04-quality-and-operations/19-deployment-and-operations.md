# 19 — OrbitOS Deployment and Operations Guide

> **Document Status:** Baseline Approved  
> **Owner:** DevOps Engineer & Infrastructure Operations Lead  
> **Target Path:** `docs/04-quality-and-operations/19-deployment-and-operations.md`  
> **Last Updated:** 2026-11-03  
> **Traceability Anchor:** `DOC-OPS-001`

---

## 1. Executive Summary & Operational Goals

This document specifies the deployment topology, local development workflows, Docker Compose orchestration, database migrations, configuration variables, and operational troubleshooting procedures for **OrbitOS**.

OrbitOS is engineered to be **100% laptop-friendly** ([ADR-001](file:///home/kashifhm333/Desktop/Project/orbit/docs/ARCHITECTURE_DECISIONS.md#adr-001-modular-monolith-architecture-over-distributed-microservices), `NFR-PORT-001`). A single developer can spin up the entire multi-tier system (FastAPI backend, PostgreSQL database, React/Three.js frontend) with a single command without incurring cloud hosting fees or requiring complex Kubernetes clusters.

---

## 2. Local Deployment Architecture (Docker Compose)

```mermaid
flowchart TD
    subgraph HostLaptop["Host Developer Laptop (Linux / macOS / Windows)"]
        subgraph DockerNetwork["Docker Bridge Network (orbitos-net)"]
            subgraph FE["frontend Service"]
                ViteNginx["Nginx Alpine / Vite Container\nPort 3000 -> 80 (HTTP)"]
            end
            
            subgraph BE["backend Service"]
                FastAPIServer["FastAPI / Uvicorn Container\nPort 8000 -> 8000 (REST & WS)"]
            end
            
            subgraph DB["database Service"]
                PostgresContainer["PostgreSQL 16 Alpine\nPort 5432 -> 5432 (TCP)"]
                VolumeData[("Docker Named Volume\npostgres_data")]
                PostgresContainer <--> VolumeData
            end
        end

        Browser["Web Browser\nhttp://localhost:3000"] --> FE
        FE -->|"Proxy /api & /ws"| BE
        BE -->|"asyncpg Connection Pool"| DB
    end

    style HostLaptop fill:#f8fafc,stroke:#334155,stroke-width:2px;
    style DockerNetwork fill:#f1f5f9,stroke:#64748b;
    style FE fill:#e0f2fe,stroke:#0369a1;
    style BE fill:#dcfce7,stroke:#15803d;
    style DB fill:#fef3c7,stroke:#d97706;
```

---

## 3. Environment Configuration (`.env`)

OrbitOS loads environment settings via `pydantic-settings`. A template `.env.example` is maintained in the repository root:

```ini
# ==============================================================================
# OrbitOS Environment Configuration
# ==============================================================================

# Application Environment (development, testing, production)
ENVIRONMENT=development
LOG_LEVEL=INFO

# Backend API & WebSocket Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]

# PostgreSQL Database Connection
DATABASE_URL=postgresql+asyncpg://orbitos_user:orbitos_password@localhost:5432/orbitos_db
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20

# Simulation Engine Parameters
SIMULATION_TICK_SECONDS=1.0
DEFAULT_SCENARIO_SEED=42
ENABLE_STOCHASTIC_FAULTS=false

# External Provider Credentials (Optional / Cached Fallback Available)
NASA_API_KEY=DEMO_KEY
CELESTRAK_CACHE_HOURS=24
HORIZONS_CACHE_DAYS=7
```

---

## 4. Single-Command Startup and Operations

### 4.1 Quickstart via Docker Compose
To build and launch the complete OrbitOS platform:

```bash
# 1. Clone repository and navigate to root
cd orbit

# 2. Verify .env file exists
test -f .env || cp .env.example .env

# 3. Spin up all containers in attached mode
docker compose up --build
```

Services will be accessible at:
- **Frontend Mission Control:** [http://localhost:3000](http://localhost:3000)
- **Backend Swagger OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint:** [http://localhost:8000/healthz](http://localhost:8000/healthz)

### 4.2 Graceful Shutdown
Pressing `Ctrl + C` or executing `docker compose down` sends `SIGINT` to the backend. The simulation engine halts the clock, flushes in-memory telemetry buffers to PostgreSQL, closes WebSocket sessions, and shuts down cleanly within 5 seconds.

---

## 5. Database Migrations and Seeding

### 5.1 Alembic Migration Commands
Database migrations are tracked using Alembic:

```bash
# Run all pending database migrations
docker compose exec backend alembic upgrade head

# Generate a new migration after modifying SQLAlchemy models
docker compose exec backend alembic revision --autogenerate -m "add_conjunction_indexes"
```

### 5.2 Seeding Standard Educational Scenarios
OrbitOS includes an automated seed script (`scripts/seed_database.py`) providing three standard educational scenarios:

```bash
docker compose exec backend python scripts/seed_database.py --scenario leo_constellation
```

| Scenario Name | Contents | Educational Purpose |
| :--- | :--- | :--- |
| `leo_constellation` | 5 Sun-synchronous satellites + 3 global ground stations. | Contact window geometry and power balance labs. |
| `conjunction_hazard` | 1 Primary satellite + 1 synthetic debris object ($d_{\text{miss}} = 560\text{ m}$). | Autonomous collision detection and avoidance maneuver lab. |
| `satellite_failure` | 2 Satellites with injected solar array degradation. | AI/ML telemetry anomaly detection and safe-hold recovery lab. |

---

## 6. Observability, Health Checks, and Structured Logging

### 6.1 Health Check Endpoints
The backend provides a standardized `/healthz` endpoint returning HTTP 200:

```json
{
  "status": "HEALTHY",
  "version": "1.0.0",
  "database": "CONNECTED",
  "simulation_engine": "READY",
  "uptime_seconds": 3612.4
}
```

### 6.2 Structured JSON Logging
All application logs are emitted as structured JSON strings to standard output:

```json
{
  "timestamp": "2026-11-04T12:00:15.120Z",
  "level": "INFO",
  "logger": "orbitos.simulation_engine",
  "tick": 1420,
  "simulation_epoch": "2026-11-04T12:00:15Z",
  "satellites_active": 5,
  "tick_duration_ms": 32.4,
  "message": "Tick completed successfully"
}
```

---

## 7. Operational Troubleshooting Guide

| Issue / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| **Port Collision (`5432` or `3000` in use)** | Local host already running PostgreSQL or another dev server. | Stop host PostgreSQL (`sudo systemctl stop postgresql`) or remap ports in `docker-compose.yml`. |
| **Database Connection Refused (`asyncpg`)** | Backend initialized before PostgreSQL was ready to accept connections. | Docker Compose `healthcheck` on database container retries connection with backoff. |
| **Three.js Canvas Shows Black Screen** | Hardware acceleration disabled in client web browser. | Enable "Use hardware acceleration when available" in browser settings or toggle 2D fallback mode. |
| **Docker Engine Out of Memory** | Docker daemon memory limit set $< 4\text{ GB}$. | Increase Docker Desktop / Engine memory allocation to $\ge 4.0\text{ GB}$ RAM. |
| **External API Rate Limit (HTTP 429)** | NASA Open API demo key request limit reached. | Inject authenticated key via `NASA_API_KEY` in `.env` or enable offline synthetic fallback mode. |

---

## 8. Cross-Document References

- **Requirements:** [02-requirements-specification.md](file:///home/kashifhm333/Desktop/Project/orbit/docs/00-project-foundation/02-requirements-specification.md) (`NFR-PORT-001`, `002`)
- **System Architecture:** [04-system-architecture.md](file:///home/kashifhm333/Desktop/Project/orbit/docs/01-system-design/04-system-architecture.md)
- **Database & API Contracts:** [14-database-and-api-contracts.md](file:///home/kashifhm333/Desktop/Project/orbit/docs/03-engineering-contracts/14-database-and-api-contracts.md)
- **Security & Safety:** [18-security-and-safety-model.md](file:///home/kashifhm333/Desktop/Project/orbit/docs/04-quality-and-operations/18-security-and-safety-model.md)
- **Implementation Roadmap:** [20-implementation-roadmap.md](file:///home/kashifhm333/Desktop/Project/orbit/docs/20-implementation-roadmap.md)

