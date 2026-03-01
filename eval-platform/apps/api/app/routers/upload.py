import asyncio
import os
import uuid
from functools import partial

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.cache import cache_set
from app.core.config import settings
from app.core.storage import save_file

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_file(filepath: str, ext: str) -> pd.DataFrame:
    """Load a CSV or Excel file (runs in a thread pool, not the event loop)."""
    if ext == ".csv":
        return pd.read_csv(filepath, low_memory=False)
    return pd.read_excel(filepath)


def _build_columns_info(df: pd.DataFrame) -> list:
    result = []
    for col in df.columns:
        nunique = int(df[col].nunique())
        info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "unique_count": nunique,
            "total_count": int(df[col].count()),
        }
        if nunique <= 200:
            info["unique_values"] = sorted(
                [str(v) for v in df[col].dropna().unique().tolist()]
            )
        result.append(info)
    return result


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".xlsx", ".csv"):
        raise HTTPException(400, "Solo se aceptan archivos .xlsx o .csv")

    # Read & validate size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            400,
            f"Archivo muy grande ({size_mb:.1f} MB). Máximo: {settings.MAX_FILE_SIZE_MB} MB",
        )

    # Persist to disk (and to S3 if configured)
    file_id = str(uuid.uuid4())[:8]
    safe_name = f"{file_id}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, safe_name)
    save_file(filepath, contents, file_id)

    # Parse in a thread pool so we don't block the event loop.
    # pd.read_excel on a 70 K-row file can take several seconds —
    # without run_in_executor that would stall every other concurrent request.
    loop = asyncio.get_event_loop()
    try:
        df = await loop.run_in_executor(None, partial(_parse_file, filepath, ext))
    except Exception as exc:
        os.remove(filepath)
        raise HTTPException(400, f"Error al leer archivo: {exc}") from exc

    columns_info = _build_columns_info(df)

    file_meta = {
        "file_id": file_id,
        "filename": file.filename,
        "filepath": filepath,
        "size_mb": round(size_mb, 2),
        "rows": len(df),
        "columns": columns_info,
    }

    # Store metadata in shared cache so all workers can find it.
    # Key is namespaced ("file:<id>") to avoid collisions.
    cache_set(f"file:{file_id}", file_meta, ttl=settings.CACHE_TTL_FILES)

    return file_meta
