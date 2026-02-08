import os
import uuid
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional, List
from app.core.config import settings

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# In-memory store for uploaded file metadata (Módulo 7 lo mueve a DB)
uploaded_files: dict = {}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Sube un archivo XLSX o CSV y devuelve las columnas y valores únicos
    para que el frontend construya los filtros dinámicos.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".xlsx", ".csv"):
        raise HTTPException(400, "Solo se aceptan archivos .xlsx o .csv")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            400,
            f"Archivo muy grande ({size_mb:.1f} MB). Máximo: {settings.MAX_FILE_SIZE_MB} MB",
        )

    # Guardar con ID único para evitar colisiones
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

    # Guardar metadata en memoria
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


@router.post("/analyze/preview")
async def analyze_preview(
    file_id: str,
    response_column: str,
    filters: Optional[dict] = None,
):
    """
    Dado un archivo subido, una columna de respuestas y filtros opcionales,
    devuelve un preview de los datos filtrados (para validar antes del análisis).
    """
    if file_id not in uploaded_files:
        raise HTTPException(404, "Archivo no encontrado. Vuelve a subirlo.")

    meta = uploaded_files[file_id]
    filepath = meta["filepath"]

    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(filepath, low_memory=False)
    else:
        df = pd.read_excel(filepath)

    if response_column not in df.columns:
        raise HTTPException(400, f"Columna '{response_column}' no existe")

    # Aplicar filtros
    if filters:
        for col_name, values in filters.items():
            if col_name in df.columns and values:
                df = df[df[col_name].astype(str).isin(values)]

    # Quitar respuestas nulas y muy cortas
    df = df[df[response_column].notna()]
    df = df[df[response_column].astype(str).str.len() >= 10]

    # Stats básicas
    responses = df[response_column].astype(str)

    return {
        "total_responses": len(responses),
        "avg_length": round(responses.str.len().mean(), 1) if len(responses) > 0 else 0,
        "sample_responses": responses.head(5).tolist(),
        "filters_applied": filters or {},
    }
