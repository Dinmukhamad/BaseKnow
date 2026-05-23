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

    # "serverless" (default) → NullPool; "server" → traditional pool.
    # See app.db.session for details.
    db_pool_mode: str = Field(default="serverless", alias="DB_POOL_MODE")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if not value:
            return value
        # Use psycopg2 driver — better compatibility with Neon/Vercel Postgres (redeploy)
        if value.startswith("postgres://"):
            value = value.replace("postgres://", "postgresql+psycopg2://", 1)
        elif value.startswith("postgresql://") and "+psycopg2" not in value:
            value = value.replace("postgresql://", "postgresql+psycopg2://", 1)
        # Ensure SSL
        if "sslmode" not in value:
            separator = "&" if "?" in value else "?"
            value = f"{value}{separator}sslmode=require"
        return value

    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60  # 1 hour — reduces token refresh calls
    refresh_token_expire_days: int = 30

    cors_origins: list[AnyHttpUrl] | list[str] = Field(default=["*"], alias="CORS_ORIGINS")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: str | list[str] | None) -> list[str]:
        if value is None or value == "":
            return ["*"]
        if isinstance(value, list):
            return value
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    # Cloudflare R2 — optional, only required for file upload functionality
    r2_account_id: str = Field(default="", alias="R2_ACCOUNT_ID")
    r2_access_key_id: str = Field(default="", alias="R2_ACCESS_KEY_ID")
    r2_secret_access_key: str = Field(default="", alias="R2_SECRET_ACCESS_KEY")
    r2_bucket_name: str = Field(default="", alias="R2_BUCKET_NAME")
    r2_public_url: str = Field(default="", alias="R2_PUBLIC_URL")

    # Comma-separated list of trusted reverse-proxy IPs whose X-Forwarded-For
    # header we honour for client IP detection (audit logs, rate limiting).
    # Leave empty to always use the direct socket IP (request.client.host).
    # Example: TRUSTED_PROXIES=10.0.0.1,10.0.0.2
    trusted_proxies: list[str] = Field(default=[], alias="TRUSTED_PROXIES")

    @field_validator("trusted_proxies", mode="before")
    @classmethod
    def parse_trusted_proxies(cls, value: str | list[str] | None) -> list[str]:
        if not value:
            return []
        if isinstance(value, list):
            return [v.strip() for v in value if v.strip()]
        return [v.strip() for v in value.split(",") if v.strip()]

    seed_admin_username: str = "admin"
    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "Admin12345!"


@lru_cache
def get_settings() -> Settings:
    return Settings()
