import os
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import settings

router = APIRouter()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Sube un archivo XLSX o CSV y devuelve las columnas y valores únicos
    para que el frontend pueda construir los filtros dinámicos.
    """
    # Validar extensión
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".xlsx", ".csv"):
        raise HTTPException(400, "Solo se aceptan archivos .xlsx o .csv")

    # Validar tamaño
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(400, f"Archivo muy grande ({size_mb:.1f} MB). Máximo: {settings.MAX_FILE_SIZE_MB} MB")

    # Guardar temporalmente
    filepath = os.path.join(settings.UPLOAD_DIR, file.filename or "upload.xlsx")
    with open(filepath, "wb") as f:
        f.write(contents)

    # Parsear con pandas
    try:
        if ext == ".csv":
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(400, f"Error al leer archivo: {str(e)}")

    # Extraer metadata para filtros
    columns_info = []
    for col in df.columns:
        nunique = int(df[col].nunique())
        col_info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "unique_count": nunique,
        }
        # Solo enviar valores únicos si son pocos (para selectores)
        if nunique <= 200:
            col_info["unique_values"] = sorted(
                [str(v) for v in df[col].dropna().unique().tolist()]
            )
        columns_info.append(col_info)

    return {
        "filename": file.filename,
        "size_mb": round(size_mb, 2),
        "rows": len(df),
        "columns": columns_info,
        "filepath": filepath,
    }
