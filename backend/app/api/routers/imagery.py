import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Response
from typing import List, Dict, Any, Optional
from app.simulation.engine import simulation_engine
from app.schemas.schemas import ImageryItemResponse, GenerateImageryRequest
from app.models.database import AsyncSessionLocal
from app.models.entities import ImageryRecord as ImageryModel
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/imagery", tags=["Earth Observation Imagery Catalog"])

# In-memory bundled synthetic imagery catalog
_imagery_store: Dict[str, Dict[str, Any]] = {
    "img-001": {
        "id": "img-001",
        "satellite_id": "sat-002",
        "mission_id": "mis-001",
        "capture_epoch": datetime(2026, 11, 4, 12, 15, 0, tzinfo=timezone.utc),
        "resolution_m": 0.5,
        "fov_deg": 3.8,
        "spectral_band": "RGB",
        "target_name": "Suez Canal Maritime Corridor",
        "target_lat": 30.5852,
        "target_lon": 32.2654,
        "image_url": "/api/v1/imagery/img-001/download",
        "cloud_cover_pct": 2.1,
        "is_synthetic": True,
        "metadata_json": {
            "ground_sample_distance_cm": 50,
            "sensor_type": "Multispectral Pushbroom Imager",
            "solar_zenith_deg": 34.2,
            "off_nadir_angle_deg": 4.1
        }
    },
    "img-002": {
        "id": "img-002",
        "satellite_id": "sat-002",
        "mission_id": "mis-002",
        "capture_epoch": datetime(2026, 11, 4, 12, 45, 0, tzinfo=timezone.utc),
        "resolution_m": 1.2,
        "fov_deg": 4.5,
        "spectral_band": "NIR",
        "target_name": "Nile Delta Agricultural Belt",
        "target_lat": 31.0000,
        "target_lon": 31.2500,
        "image_url": "/api/v1/imagery/img-002/download",
        "cloud_cover_pct": 8.4,
        "is_synthetic": True,
        "metadata_json": {
            "ground_sample_distance_cm": 120,
            "sensor_type": "Near-Infrared Vegetation Index Imager",
            "ndvi_mean": 0.72
        }
    },
    "img-003": {
        "id": "img-003",
        "satellite_id": "sat-001",
        "mission_id": None,
        "capture_epoch": datetime(2026, 11, 4, 13, 5, 0, tzinfo=timezone.utc),
        "resolution_m": 2.5,
        "fov_deg": 8.0,
        "spectral_band": "SAR",
        "target_name": "Strait of Gibraltar Chokepoint",
        "target_lat": 35.9500,
        "target_lon": -5.6000,
        "image_url": "/api/v1/imagery/img-003/download",
        "cloud_cover_pct": 0.0,
        "is_synthetic": True,
        "metadata_json": {
            "sensor_type": "C-Band Synthetic Aperture Radar",
            "polarization": "VV+VH",
            "incident_angle_deg": 28.5
        }
    }
}

@router.get("", response_model=List[ImageryItemResponse])
async def list_imagery(
    satellite_id: Optional[str] = Query(None),
    spectral_band: Optional[str] = Query(None)
):
    """Retrieves synthetic Earth observation imagery catalog with filtering."""
    results = list(_imagery_store.values())
    if satellite_id:
        results = [img for img in results if img["satellite_id"] == satellite_id]
    if spectral_band:
        results = [img for img in results if img["spectral_band"].upper() == spectral_band.upper()]
    return results

@router.get("/{image_id}", response_model=ImageryItemResponse)
async def get_imagery_details(image_id: str):
    """Retrieves metadata for a specific captured image."""
    img = _imagery_store.get(image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Imagery record not found")
    return img

@router.post("/generate", response_model=ImageryItemResponse)
async def generate_synthetic_imagery(req: GenerateImageryRequest):
    """Simulates payload acquisition and generates synthetic EO imagery record."""
    sat = simulation_engine.satellites.get(req.satellite_id) or simulation_engine.satellites.get(req.satellite_id.lower())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite {req.satellite_id} not found")

    new_id = f"img-{str(uuid.uuid4())[:8]}"
    now = simulation_engine.current_epoch

    item = {
        "id": new_id,
        "satellite_id": sat["id"],
        "mission_id": None,
        "capture_epoch": now,
        "resolution_m": req.resolution_m,
        "fov_deg": 4.0,
        "spectral_band": req.spectral_band.upper(),
        "target_name": req.target_name,
        "target_lat": req.target_lat,
        "target_lon": req.target_lon,
        "image_url": f"/api/v1/imagery/{new_id}/download",
        "cloud_cover_pct": round(float(simulation_engine.rng.uniform(0.0, 15.0)), 1),
        "is_synthetic": True,
        "metadata_json": {
            "satellite_name": sat["name"],
            "orbit_altitude_km": round((np_norm(sat["pos_eci"]) - 6378137.0) / 1000.0, 1),
            "synthetic_notice": "SIMULATION ONLY: Procedurally generated aerospace demonstration asset"
        }
    }
    _imagery_store[new_id] = item

    # Record event
    simulation_engine.record_event(
        "IMAGERY_CAPTURED",
        f"Synthetic {req.spectral_band} imagery captured of {req.target_name} by {sat['name']}",
        "INFO",
        sat["id"]
    )
    return item

def np_norm(v: List[float]) -> float:
    import math
    return math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)

@router.get("/{image_id}/download")
async def download_synthetic_image(image_id: str):
    """Generates a downloadable synthetic SVG payload image asset."""
    img = _imagery_store.get(image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Imagery record not found")

    # Generate synthetic SVG raster preview
    band_color = "#38bdf8" if img["spectral_band"] == "RGB" else "#a855f7" if img["spectral_band"] == "NIR" else "#f59e0b"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050B16"/>
      <stop offset="100%" stop-color="#10243B"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1A3450" stroke-width="0.8"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#grid)"/>
  
  <!-- Simulated Terrain Contours -->
  <circle cx="400" cy="300" r="180" fill="none" stroke="{band_color}" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.6"/>
  <circle cx="400" cy="300" r="120" fill="{band_color}" opacity="0.1"/>
  <circle cx="400" cy="300" r="60" fill="{band_color}" opacity="0.2"/>
  
  <!-- Target Crosshair -->
  <line x1="400" y1="80" x2="400" y2="520" stroke="{band_color}" stroke-width="1" opacity="0.7"/>
  <line x1="180" y1="300" x2="620" y2="300" stroke="{band_color}" stroke-width="1" opacity="0.7"/>
  
  <!-- HUD Text Overlay -->
  <text x="30" y="45" fill="#00D5FF" font-family="monospace" font-size="16" font-weight="bold">OrbitOS EARTH OBSERVATION PAYLOAD</text>
  <text x="30" y="70" fill="#E8F0FA" font-family="monospace" font-size="13">TARGET: {img['target_name']}</text>
  <text x="30" y="90" fill="#8295AC" font-family="monospace" font-size="11">COORDINATES: {img['target_lat']}°N, {img['target_lon']}°E | BAND: {img['spectral_band']}</text>
  <text x="30" y="110" fill="#8295AC" font-family="monospace" font-size="11">GSD RESOLUTION: {img['resolution_m']}m | CLOUD COVER: {img['cloud_cover_pct']}%</text>
  <text x="30" y="130" fill="#8295AC" font-family="monospace" font-size="11">CAPTURE EPOCH: {img['capture_epoch'].isoformat()}</text>
  <text x="30" y="560" fill="#FFB547" font-family="monospace" font-size="10">SYNTHETIC OBSERVATION DATA — NOT FOR OPERATIONAL NAVIGATION</text>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml")
