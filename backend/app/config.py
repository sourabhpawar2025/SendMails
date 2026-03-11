"""Load settings from environment."""
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment."""

    # App
    APP_NAME: str = "SMTP Email Sender API"
    DEBUG: bool = False

    # Database (scraperdb)
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DATABASE: str = "scraperdb"

    @property
    def database_url(self) -> str:
        host = self.MYSQL_HOST.strip()
        if "@" in host:
            host = host.split("@")[-1]
        user = quote_plus(self.MYSQL_USER)
        password = quote_plus(self.MYSQL_PASSWORD)
        return (
            f"mysql+pymysql://{user}:{password}"
            f"@{host}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )

    # Redis (for Celery)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    @property
    def redis_url(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Encryption key for SMTP passwords (32 bytes hex for Fernet)
    ENCRYPTION_KEY: str = ""

    # Default SMTP (optional fallback)
    DEFAULT_SMTP_HOST: str = "smtp.gmail.com"
    DEFAULT_SMTP_PORT: int = 587

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
