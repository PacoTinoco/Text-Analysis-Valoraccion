from fastapi import APIRouter

from app.core.cache import cache_health
from app.core.config import settings
from app.core.storage import storage_health

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.VERSION,
        "service": settings.PROJECT_NAME,
        "cache": cache_health(),
        "storage": storage_health(),
    }
