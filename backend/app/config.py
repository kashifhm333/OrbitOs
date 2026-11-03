import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")

    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8000)
    CORS_ORIGINS: List[str] = Field(default=["http://localhost:3000", "http://127.0.0.1:3000", "*"])

    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./orbitos.db")
    DB_POOL_SIZE: int = Field(default=10)
    DB_MAX_OVERFLOW: int = Field(default=20)

    SIMULATION_TICK_SECONDS: float = Field(default=1.0)
    DEFAULT_SCENARIO_SEED: int = Field(default=42)
    ENABLE_STOCHASTIC_FAULTS: bool = Field(default=False)

    NASA_API_KEY: str = Field(default="mCB7BzpD6WCzrJgfJgngMMtgmBmFWhbHCdp8WkJg")
    CELESTRAK_CACHE_HOURS: int = Field(default=24)
    HORIZONS_CACHE_DAYS: int = Field(default=7)

settings = Settings()
