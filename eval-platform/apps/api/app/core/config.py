from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "EvalPlatform API"
    VERSION: str = "0.1.0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Claude API (para Módulo 5)
    ANTHROPIC_API_KEY: str = ""

    # Upload
    MAX_FILE_SIZE_MB: int = 100
    UPLOAD_DIR: str = "./uploads"

    # Cache
    # Redis URL — leave empty to use the in-memory fallback (fine for local dev)
    REDIS_URL: str = ""
    # How long uploaded file metadata stays in cache (2 hours)
    CACHE_TTL_FILES: int = 7200
    # How long analysis results stay in cache (1 hour)
    CACHE_TTL_ANALYSIS: int = 3600

    # AWS / S3 file storage
    # Leave all empty to use local disk (default for dev and single-server deploy)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
