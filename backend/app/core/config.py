from functools import lru_cache
import json
from pathlib import Path

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Contact Center Platform"
    environment: str = "dev"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(..., alias="DATABASE_URL")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if not value:
            return value
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    cors_origins: list[AnyHttpUrl] | list[str] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: str | list[str] | None) -> list[str]:
        if value is None or value == "":
            return ["http://localhost:5173"]
        if isinstance(value, list):
            return value
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    r2_account_id: str = Field(..., env="R2_ACCOUNT_ID")
    r2_access_key_id: str = Field(..., env="R2_ACCESS_KEY_ID")
    r2_secret_access_key: str = Field(..., env="R2_SECRET_ACCESS_KEY")
    r2_bucket_name: str = Field(..., env="R2_BUCKET_NAME")
    r2_public_url: str = Field(..., env="R2_PUBLIC_URL")

    seed_admin_username: str = "admin"
    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "Admin12345!"


@lru_cache
def get_settings() -> Settings:
    return Settings()
