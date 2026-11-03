import hashlib
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseDataProvider(ABC):
    """
    Abstract Base Adapter for all third-party external space data providers.
    Enforces provenance tracking, caching, offline fallback, and schema validation.
    """

    def __init__(self, provider_name: str, cache_ttl_seconds: int = 86400):
        self.provider_name = provider_name
        self.cache_ttl_seconds = cache_ttl_seconds
        self._memory_cache: Optional[Dict[str, Any]] = None
        self._last_fetch_epoch: float = 0.0

    @staticmethod
    def compute_sha256(data: Any) -> str:
        """Computes deterministic SHA-256 checksum of payload."""
        serialized = json.dumps(data, sort_keys=True).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()

    @abstractmethod
    async def fetch(self, identifier: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetches data from cache or remote provider, falling back to local seed."""
        pass

    @abstractmethod
    def load_offline_fallback(self) -> Dict[str, Any]:
        """Loads static bundled educational seed data when network is unavailable."""
        pass

