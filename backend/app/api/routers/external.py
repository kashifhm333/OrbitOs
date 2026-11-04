from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from app.external.nasa_donki import NasaDonkiAdapter
from app.external.celestrak import CelesTrakAdapter
from app.external.horizons import HorizonsAdapter

router = APIRouter(tags=["External Data Sources"])

donki_adapter = NasaDonkiAdapter()
celestrak_adapter = CelesTrakAdapter()
horizons_adapter = HorizonsAdapter()

@router.get("/status")
async def get_external_providers_status() -> Dict[str, Any]:
    """
    Checks the connectivity and caching state of all 3 third-party space data providers.
    """
    return {
        "providers": [
            {
                "name": "NASA_DONKI",
                "target": "Space Weather (Solar Flares & CMEs)",
                "cached": donki_adapter._memory_cache is not None,
                "cache_ttl_hours": donki_adapter.cache_ttl_seconds / 3600.0,
                "last_epoch": getattr(donki_adapter, "_last_fetch_epoch", 0.0)
            },
            {
                "name": "CELESTRAK",
                "target": "General Perturbations (GP) TLE Satellite Elements",
                "cached": celestrak_adapter._memory_cache is not None,
                "cache_ttl_hours": celestrak_adapter.cache_ttl_seconds / 3600.0,
                "last_epoch": getattr(celestrak_adapter, "_last_fetch_epoch", 0.0)
            },
            {
                "name": "NASA_JPL_HORIZONS",
                "target": "Celestial Ephemeris Vectors (Moon & Sun)",
                "cached": horizons_adapter._memory_cache is not None,
                "cache_ttl_hours": horizons_adapter.cache_ttl_seconds / 3600.0,
                "last_epoch": getattr(horizons_adapter, "_last_fetch_epoch", 0.0)
            }
        ]
    }

@router.get("/space-weather")
async def get_space_weather(force_refresh: bool = Query(False)) -> Dict[str, Any]:
    """
    Retrieves space weather alerts and solar flare history from NASA DONKI or offline fallback.
    """
    data = await donki_adapter.fetch(force_refresh=force_refresh)
    return data

@router.get("/celestrak")
async def get_celestrak_catalog(group: str = Query("stations"), force_refresh: bool = Query(False)) -> Dict[str, Any]:
    """
    Retrieves TLE constellation elements from CelesTrak or offline fallback.
    """
    data = await celestrak_adapter.fetch(identifier=group, force_refresh=force_refresh)
    return data

@router.get("/horizons")
async def get_horizons_ephemeris(command: str = Query("301"), force_refresh: bool = Query(False)) -> Dict[str, Any]:
    """
    Retrieves body ephemeris vectors from NASA JPL Horizons or offline fallback.
    """
    data = await horizons_adapter.fetch(identifier=command, force_refresh=force_refresh)
    return data

