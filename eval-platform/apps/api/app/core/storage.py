"""
File storage service — S3 primary, local disk fallback.

Why this exists:
  In a cloud environment (ECS, Fargate, etc.) containers are stateless: the
  local filesystem disappears when a container restarts or is replaced.
  S3 gives us durable, shared storage that every container can access.

  When AWS credentials / bucket are not configured (local dev, single EC2 with
  Docker Compose), the service automatically falls back to the local UPLOAD_DIR
  so the code works identically with no extra setup.

Strategy:
  - On upload   → save to local disk AND upload to S3 (if available)
  - On analysis → check local disk first; if missing, restore from S3
  This gives fast reads (local) with durability (S3) without extra latency on
  the happy path.

Usage:
  from app.core.storage import save_file, ensure_local, storage_health

  save_file(filepath, content_bytes, file_id)
  local_path = ensure_local(filepath, file_id)   # restores from S3 if needed
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# ── S3 client singleton ────────────────────────────────────────────────────────
_s3_client = None
_s3_available: Optional[bool] = None  # None = not yet tested


def _get_s3():
    """Return a live boto3 S3 client, or None if S3 is not configured."""
    global _s3_client, _s3_available

    if _s3_available is False:
        return None
    if _s3_client is not None:
        return _s3_client

    try:
        from app.core.config import settings

        if not settings.AWS_S3_BUCKET:
            _s3_available = False
            logger.info("ℹ️  AWS_S3_BUCKET not set — using local file storage")
            return None

        import boto3

        client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
        # Quick connectivity check
        client.head_bucket(Bucket=settings.AWS_S3_BUCKET)
        _s3_client = client
        _s3_available = True
        logger.info("✅ S3 connected — bucket: %s", settings.AWS_S3_BUCKET)
        return client

    except Exception as exc:
        _s3_available = False
        logger.warning("⚠️  S3 unavailable (%s) — using local file storage", exc)
        return None


def _s3_key(file_id: str, filename: str) -> str:
    """Consistent S3 object key for a given upload."""
    return f"uploads/{file_id}/{os.path.basename(filename)}"


# ── Public API ─────────────────────────────────────────────────────────────────

def save_file(filepath: str, content: bytes, file_id: str) -> None:
    """
    Persist *content* to *filepath* on local disk.
    If S3 is configured, also upload there for cross-container durability.
    """
    # Always write locally so analysis can read it without extra network I/O.
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    with open(filepath, "wb") as fh:
        fh.write(content)

    s3 = _get_s3()
    if s3:
        from app.core.config import settings
        key = _s3_key(file_id, filepath)
        try:
            s3.put_object(Bucket=settings.AWS_S3_BUCKET, Key=key, Body=content)
            logger.info("☁️  Uploaded to S3: %s", key)
        except Exception as exc:
            # S3 failure is non-fatal — the local copy is still usable.
            logger.warning("⚠️  S3 upload failed (%s) — local copy kept", exc)


def ensure_local(filepath: str, file_id: str) -> bool:
    """
    Guarantee that *filepath* exists on local disk.
    If the file is missing (e.g. container was restarted), download it from S3.

    Returns True if the file is available, False if it can't be recovered.
    """
    if os.path.exists(filepath):
        return True

    s3 = _get_s3()
    if not s3:
        return False

    from app.core.config import settings
    key = _s3_key(file_id, filepath)
    try:
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        s3.download_file(settings.AWS_S3_BUCKET, key, filepath)
        logger.info("♻️  Restored from S3: %s → %s", key, filepath)
        return True
    except Exception as exc:
        logger.warning("⚠️  S3 restore failed for %s: %s", key, exc)
        return False


def storage_health() -> dict:
    """Describe the current storage backend and its status."""
    s3 = _get_s3()
    if s3:
        try:
            from app.core.config import settings
            s3.head_bucket(Bucket=settings.AWS_S3_BUCKET)
            return {"backend": "s3", "status": "ok", "bucket": settings.AWS_S3_BUCKET}
        except Exception as exc:
            return {"backend": "s3", "status": "error", "detail": str(exc)}
    return {"backend": "local", "status": "ok"}
