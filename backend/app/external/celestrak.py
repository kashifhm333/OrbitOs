import os
import json
import httpx
import time
from typing import Dict, Any, Optional
from app.config import settings
from app.external.base import BaseDataProvider

class CelesTrakAdapter(BaseDataProvider):
    """
    Adapter for CelesTrak General Perturbations (GP) Satellite Ephemeris Catalog.
    """

    BASE_URL = "https://celestrak.org/NORAD/elements/gp.php"

    def __init__(self):
        super().__init__(provider_name="CELESTRAK", cache_ttl_seconds=settings.CELESTRAK_CACHE_HOURS * 3600)

    def load_offline_fallback(self) -> Dict[str, Any]:
        seed_path = os.path.join("data", "seeds", "fallback_celestrak_tles.json")
        if os.path.exists(seed_path):
            with open(seed_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "provider": "CELESTRAK",
            "is_synthetic": True,
            "satellites": []
        }

    async def fetch(self, identifier: Optional[str] = "stations", force_refresh: bool = False) -> Dict[str, Any]:
        current_time = time.time()
        if not force_refresh and self._memory_cache and (current_time - self._last_fetch_epoch) < self.cache_ttl_seconds:
            return self._memory_cache

        try:
            url = f"{self.BASE_URL}?GROUP={identifier or 'stations'}&FORMAT=json"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    raw_data = resp.json()
                    result = {
                        "provider": "CELESTRAK",
                        "status": "ONLINE",
                        "retrieval_epoch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "validation_checksum": self.compute_sha256(raw_data),
                        "is_synthetic": False,
                        "satellites": raw_data[:10] if isinstance(raw_data, list) else []
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

