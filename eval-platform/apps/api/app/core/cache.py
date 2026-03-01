"""
Cache service — Redis primary, in-memory fallback.

Why this exists:
  FastAPI can run with multiple workers (--workers N). Each worker is a separate
  process with its own memory, so a plain Python dict isn't shared between them.
  Redis solves this: all workers connect to the same Redis instance and see the
  same data.

  When Redis is not available (local dev without Docker), the service
  automatically falls back to an in-memory dict with TTL support so the code
  works identically — just not shared across workers.

Usage:
  from app.core.cache import cache_set, cache_get, cache_delete, cache_health

  cache_set("file:abc123", {"filepath": "...", "rows": 70000}, ttl=7200)
  meta = cache_get("file:abc123")   # → dict or None
  cache_delete("file:abc123")
"""

import json
import logging
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── In-memory fallback store ──────────────────────────────────────────────────
_store: dict = {}
_expiry: dict = {}

# ── Redis connection state ─────────────────────────────────────────────────────
_redis_client = None
_redis_available: Optional[bool] = None  # None = not yet tested


def _get_redis():
    """
    Return a live Redis client, or None if Redis is unavailable.
    Connection is attempted only once; failures are cached to avoid
    hammering a missing server on every request.
    """
    global _redis_client, _redis_available

    if _redis_available is False:
        return None
    if _redis_client is not None:
        return _redis_client

    try:
        from app.core.config import settings
        if not settings.REDIS_URL:
            _redis_available = False
            logger.info("ℹ️  REDIS_URL not set — using in-memory cache")
            return None

        import redis

        client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()  # Verify the connection is alive
        _redis_client = client
        _redis_available = True
        logger.info("✅ Redis connected at %s", settings.REDIS_URL)
        return _redis_client

    except Exception as exc:
        _redis_available = False
        logger.warning("⚠️  Redis unavailable (%s) — using in-memory cache", exc)
        return None


# ── Public API ────────────────────────────────────────────────────────────────

def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    """Store *value* under *key* with a time-to-live in seconds."""
    r = _get_redis()
    if r:
        try:
            r.setex(key, ttl, json.dumps(value, default=str))
            return
        except Exception as exc:
            logger.warning("Redis SET failed (%s) — falling back to memory", exc)

    # In-memory fallback
    _store[key] = value
    _expiry[key] = time.time() + ttl


def cache_get(key: str) -> Optional[Any]:
    """Return the cached value for *key*, or None if missing / expired."""
    r = _get_redis()
    if r:
        try:
            raw = r.get(key)
            return json.loads(raw) if raw is not None else None
        except Exception as exc:
            logger.warning("Redis GET failed (%s) — falling back to memory", exc)

    # In-memory fallback
    if key in _store:
        if time.time() < _expiry.get(key, 0):
            return _store[key]
        # Entry expired — clean up
        _store.pop(key, None)
        _expiry.pop(key, None)
    return None


def cache_delete(key: str) -> None:
    """Remove *key* from the cache."""
    r = _get_redis()
    if r:
        try:
            r.delete(key)
        except Exception:
            pass
    _store.pop(key, None)
    _expiry.pop(key, None)


def cache_health() -> dict:
    """Return a dict describing the current cache backend and its status."""
    r = _get_redis()
    if r:
        try:
            r.ping()
            return {"backend": "redis", "status": "ok"}
        except Exception as exc:
            return {"backend": "redis", "status": "error", "detail": str(exc)}
    return {"backend": "memory", "status": "ok"}
