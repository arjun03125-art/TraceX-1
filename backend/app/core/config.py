from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Forensic Recovery Platform"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/forensic.db"

    # Redis / Celery
    REDIS_URL: str | None = None
    CELERY_BROKER_URL: str = "memory://"
    CELERY_RESULT_BACKEND: str = "cache://"

    # Security
    SECRET_KEY: str = Field(
        default="dev-secret-key-change-in-production-min-32-chars-long",
        min_length=32,
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Evidence Storage
    EVIDENCE_ROOT_PATH: Path = Path("./evidence")
    MAX_UPLOAD_SIZE: int = 10737418240  # 10GB

    # Forensic Engine Paths
    XFS_TOOL_PATH: str | None = None
    BTRFS_TOOL_PATH: str | None = None
    CARVING_TOOL_PATH: str | None = None
    SLEUTHKIT_PATH: str | None = None

    # Reporting
    REPORT_OUTPUT_PATH: Path = Path("./evidence/reports")

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Frontend URLs (for CORS)
    FRONTEND_URL: str = "http://localhost:3000"

    @field_validator("EVIDENCE_ROOT_PATH", "REPORT_OUTPUT_PATH", mode="before")
    @classmethod
    def expand_path(cls, v: str | Path) -> Path:
        if isinstance(v, str):
            return Path(v).expanduser().resolve()
        return v.expanduser().resolve()

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def database_url_async(self) -> str:
        """Ensure async driver for SQLAlchemy."""
        url = self.DATABASE_URL
        if url.startswith("sqlite://"):
            return url.replace("sqlite://", "sqlite+aiosqlite://")
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://")
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
