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
    external
)
from app.websockets import telemetry
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

# Include All Routers
app.include_router(simulations.router)
app.include_router(satellites.router)
app.include_router(conjunctions.router)
app.include_router(ground_stations.router)
app.include_router(missions.router)
app.include_router(maneuvers.router)
app.include_router(intelligence.router)
app.include_router(external.router)
app.include_router(telemetry.router)

# Also expose v1 aliases for contract parity
app.include_router(conjunctions.router, prefix="/api/v1")
app.include_router(satellites.router, prefix="/api/v1")
app.include_router(ground_stations.router, prefix="/api/v1")
app.include_router(missions.router, prefix="/api/v1")
app.include_router(maneuvers.router, prefix="/api/v1")

@app.get("/healthz", tags=["System"])
async def health_check():
    """System health check endpoint verifying engine and API status."""
    return {
        "status": "HEALTHY",
        "version": "1.0.0",
        "simulation_engine": simulation_engine.clock_state,
        "simulation_epoch": simulation_engine.current_epoch.isoformat(),
        "active_satellites": len(simulation_engine.satellites),
        "safety_mode": "SIMULATION_ONLY_ISOLATED"
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
