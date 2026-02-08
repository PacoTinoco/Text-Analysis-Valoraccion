from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "EvalPlatform API"
    VERSION: str = "0.1.0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Claude API (para Módulo 5)
    ANTHROPIC_API_KEY: str = ""

    # Upload
    MAX_FILE_SIZE_MB: int = 100
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"


settings = Settings()
