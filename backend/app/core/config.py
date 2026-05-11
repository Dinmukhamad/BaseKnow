from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Contact Center Platform"
    environment: str = "dev"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(..., alias="DATABASE_URL")

    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    cors_origins: list[AnyHttpUrl] | list[str] = ["http://localhost:5173"]
    upload_dir: Path = Path("uploads")
    max_upload_size_mb: int = 25

    seed_admin_username: str = "admin"
    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "Admin12345!"


@lru_cache
def get_settings() -> Settings:
    return Settings()
