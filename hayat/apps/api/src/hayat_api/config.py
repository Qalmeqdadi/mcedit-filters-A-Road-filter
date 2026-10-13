from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="HAYAT_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://hayat:hayat@localhost:5432/hayat"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    stream_poll_seconds: float = 0.5


@lru_cache
def get_settings() -> Settings:
    return Settings()
