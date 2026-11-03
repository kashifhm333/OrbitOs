import os
import json
import httpx
import time
from typing import Dict, Any, Optional
from app.config import settings
from app.external.base import BaseDataProvider

class NasaDonkiAdapter(BaseDataProvider):
    """
    Adapter for NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information).
    Used to model solar flares, CMEs, and link budget degradations.
    """

    BASE_URL = "https://api.nasa.gov/DONKI"

    def __init__(self):
        super().__init__(provider_name="NASA_DONKI", cache_ttl_seconds=settings.CELESTRAK_CACHE_HOURS * 3600)
        self.api_key = settings.NASA_API_KEY

    def load_offline_fallback(self) -> Dict[str, Any]:
        seed_path = os.path.join("data", "seeds", "fallback_space_weather.json")
        if os.path.exists(seed_path):
            with open(seed_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {
            "provider": "NASA_DONKI",
            "is_synthetic": True,
            "solar_flares": []
        }

    async def fetch(self, identifier: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
        current_time = time.time()
        if not force_refresh and self._memory_cache and (current_time - self._last_fetch_epoch) < self.cache_ttl_seconds:
            return self._memory_cache

        # Attempt remote query
        try:
            url = f"{self.BASE_URL}/FLR"
            params = {
                "api_key": self.api_key
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    raw_data = resp.json()
                    result = {
                        "provider": "NASA_DONKI",
                        "status": "ONLINE",
                        "retrieval_epoch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "validation_checksum": self.compute_sha256(raw_data),
                        "is_synthetic": False,
                        "solar_flares": raw_data[:5] if isinstance(raw_data, list) else []
                    }
                    self._memory_cache = result
                    self._last_fetch_epoch = current_time
                    return result
        except Exception:
            pass  # Fall through to offline fallback on network or API failure

        fallback = self.load_offline_fallback()
        fallback["status"] = "OFFLINE_FALLBACK_ACTIVE"
        self._memory_cache = fallback
        return fallback

