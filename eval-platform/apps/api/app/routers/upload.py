import os
import uuid
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from app.core.config import settings

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# In-memory store for uploaded file metadata
uploaded_files: dict = {}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".xlsx", ".csv"):
        raise HTTPException(400, "Solo se aceptan archivos .xlsx o .csv")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            400,
            f"Archivo muy grande ({size_mb:.1f} MB). Maximo: {settings.MAX_FILE_SIZE_MB} MB",
        )

    file_id = str(uuid.uuid4())[:8]
    safe_name = f"{file_id}_{file.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(filepath, "wb") as f:
        f.write(contents)

    try:
        if ext == ".csv":
            df = pd.read_csv(filepath, low_memory=False)
        else:
            df = pd.read_excel(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(400, f"Error al leer archivo: {str(e)}")

    columns_info = []
    for col in df.columns:
        nunique = int(df[col].nunique())
        col_info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "unique_count": nunique,
            "total_count": int(df[col].count()),
        }
        if nunique <= 200:
            values = df[col].dropna().unique().tolist()
            col_info["unique_values"] = sorted([str(v) for v in values])
        columns_info.append(col_info)

    file_meta = {
        "file_id": file_id,
        "filename": file.filename,
        "filepath": filepath,
        "size_mb": round(size_mb, 2),
        "rows": len(df),
        "columns": columns_info,
    }
    uploaded_files[file_id] = file_meta

    return file_meta