import pytest
from app.external.nasa_donki import NasaDonkiAdapter
from app.external.celestrak import CelesTrakAdapter
from app.external.horizons import HorizonsAdapter

@pytest.mark.asyncio
async def test_nasa_donki_offline_fallback():
    """TC-EXT-003: Verifies offline fallback and data structure for NASA DONKI."""
    adapter = NasaDonkiAdapter()
    data = adapter.load_offline_fallback()
    assert data["provider"] == "NASA_DONKI"
    assert "solar_flares" in data
    assert isinstance(data["solar_flares"], list)
    assert len(data["solar_flares"]) > 0

@pytest.mark.asyncio
async def test_celestrak_offline_fallback():
    """TC-EXT-003 & TC-EXT-004: Verifies CelesTrak offline fallback and provenance."""
    adapter = CelesTrakAdapter()
    data = adapter.load_offline_fallback()
    assert data["provider"] == "CELESTRAK"
    assert "satellites" in data
    assert len(data["satellites"]) > 0
    # ISS or Tiangong should be present
    first_sat = data["satellites"][0]
    assert "OBJECT_NAME" in first_sat or "name" in first_sat
    assert "NORAD_CAT_ID" in first_sat or "norad_cat_id" in first_sat

@pytest.mark.asyncio
async def test_horizons_offline_fallback():
    """TC-EXT-003 & TC-EXT-004: Verifies JPL Horizons fallback vectors."""
    adapter = HorizonsAdapter()
    data = adapter.load_offline_fallback()
    assert data["provider"] == "NASA_JPL_HORIZONS"
    assert "vectors" in data
    assert len(data["vectors"]) >= 2
    first_vec = data["vectors"][0]
    assert "position_eci_km" in first_vec
    assert len(first_vec["position_eci_km"]) == 3
