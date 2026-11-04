from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.database import init_db
from app.api.routers import (
    simulations,
    satellites,
    conjunctions,
    ground_stations,
    missions,
    maneuvers,
    intelligence,
    external,
    telemetry as telemetry_router,
    orbits as orbits_router,
    passes as passes_router,
    imagery as imagery_router,
    faults as faults_router,
    alerts as alerts_router,
    reports as reports_router,
    ml as ml_router
)
from app.websockets import telemetry as telemetry_ws
from app.simulation.engine import simulation_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database schema tables
    await init_db()
    yield
    # Shutdown: ensure clock loop is halted
    simulation_engine.pause()

app = FastAPI(
    title="OrbitOS Simulation API",
    description="Autonomous Space Mission Management Simulator — Academic & Research Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Core Routers
app.include_router(simulations.router)
app.include_router(satellites.router, prefix="/api/v1/satellites")
app.include_router(satellites.router, prefix="/api/satellites")
app.include_router(telemetry_router.router)
app.include_router(orbits_router.router)
app.include_router(passes_router.router)
app.include_router(imagery_router.router)
app.include_router(faults_router.router)
app.include_router(alerts_router.router)
app.include_router(reports_router.router)

# Dual-mount Routers (/api and /api/v1)
app.include_router(conjunctions.router, prefix="/api/conjunctions")
app.include_router(conjunctions.router, prefix="/api/v1/conjunctions")
app.include_router(ground_stations.router, prefix="/api/ground-stations")
app.include_router(ground_stations.router, prefix="/api/v1/ground-stations")
app.include_router(missions.router, prefix="/api/missions")
app.include_router(missions.router, prefix="/api/v1/missions")
app.include_router(maneuvers.router, prefix="/api/maneuvers")
app.include_router(maneuvers.router, prefix="/api/v1/maneuvers")
app.include_router(intelligence.router)
app.include_router(ml_router.router)
app.include_router(external.router, prefix="/api/external")
app.include_router(external.router, prefix="/api/v1/external")
app.include_router(telemetry_ws.router)

@app.get("/healthz", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """System health check endpoint verifying engine and API status."""
    return {
        "status": "HEALTHY",
        "version": "1.0.0",
        "simulation_engine": simulation_engine.clock_state,
        "simulation_epoch": simulation_engine.current_epoch.isoformat(),
        "active_satellites": len(simulation_engine.satellites),
        "active_alerts": len(simulation_engine.active_alerts),
        "safety_mode": "SIMULATION_ONLY_ISOLATED",
        "database": "CONNECTED"
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "system": "OrbitOS",
        "description": "Autonomous Space Mission Management Simulator",
        "status": "OPERATIONAL",
        "docs_url": "/docs",
        "safety_notice": "SIMULATION ONLY: Not connected to real spacecraft"
    }
