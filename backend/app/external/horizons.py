import os
import json
import httpx
import time
from typing import Dict, Any, Optional
from app.config import settings
from app.external.base import BaseDataProvider

class HorizonsAdapter(BaseDataProvider):
    """
    Adapter for NASA JPL Horizons System API.
    Retrieves planetary and lunar ephemeris state vectors.
    """

    BASE_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"

    def __init__(self):
        super().__init__(provider_name="NASA_JPL_HORIZONS", cache_ttl_seconds=7 * 86400)

    def load_offline_fallback(self) -> Dict[str, Any]:
        seed_path = os.path.join("data", "seeds", "fallback_horizons_moon.json")
        if os.path.exists(seed_path):
            with open(seed_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "provider": "NASA_JPL_HORIZONS",
            "target": "MOON (301)",
            "coordinate_center": "EARTH CENTER (@399)",
            "is_synthetic": True,
            "vectors": []
        }

    async def fetch(self, identifier: Optional[str] = "301", force_refresh: bool = False) -> Dict[str, Any]:
        current_time = time.time()
        if not force_refresh and self._memory_cache and (current_time - self._last_fetch_epoch) < self.cache_ttl_seconds:
            return self._memory_cache

        try:
            params = {
                "format": "json",
                "COMMAND": f"'{identifier or '301'}'",
                "CENTER": "'@399'",
                "MAKE_EPHEM": "'YES'",
                "EPHEM_TYPE": "'VECTORS'",
                "REF_PLANE": "'FRAME'"
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(self.BASE_URL, params=params)
                if resp.status_code == 200:
                    raw_data = resp.json()
                    result = {
                        "provider": "NASA_JPL_HORIZONS",
                        "status": "ONLINE",
                        "target": identifier or "301",
                        "coordinate_center": "EARTH CENTER (@399)",
                        "retrieval_epoch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "validation_checksum": self.compute_sha256(raw_data),
                        "is_synthetic": False,
                        "raw_result": raw_data.get("result", "")[:500]
                    }
                    self._memory_cache = result
                    self._last_fetch_epoch = current_time
                    return result
        except Exception:
            pass

        fallback = self.load_offline_fallback()
        fallback["status"] = "OFFLINE_FALLBACK_ACTIVE"
        self._memory_cache = fallback
        return fallback

