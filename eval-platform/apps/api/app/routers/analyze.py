import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from app.routers.upload import uploaded_files
from app.services.text_analyzer import analyze_responses, analyze_by_group

router = APIRouter()


class AnalyzeRequest(BaseModel):
    file_id: str
    response_column: str
    filters: Optional[Dict[str, List[str]]] = None
    group_by: Optional[str] = None


@router.post("/analyze")
async def run_analysis(req: AnalyzeRequest):
    if req.file_id not in uploaded_files:
        raise HTTPException(404, "Archivo no encontrado. Vuelve a subirlo.")

    meta = uploaded_files[req.file_id]
    filepath = meta["filepath"]

    if not os.path.exists(filepath):
        raise HTTPException(404, "Archivo ya no existe en el servidor.")

    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(filepath, low_memory=False)
    else:
        df = pd.read_excel(filepath)

    if req.response_column not in df.columns:
        raise HTTPException(400, f"Columna '{req.response_column}' no existe")

    # Aplicar filtros
    if req.filters:
        for col_name, values in req.filters.items():
            if col_name in df.columns and values:
                df = df[df[col_name].astype(str).isin(values)]

    # Quitar nulos
    df = df[df[req.response_column].notna()]
    responses = df[req.response_column].astype(str).tolist()

    if len(responses) == 0:
        raise HTTPException(400, "No hay respuestas con los filtros seleccionados.")

    # Análisis general
    general = analyze_responses(responses)

    # Análisis por grupo (si se pidió)
    by_group = None
    if req.group_by and req.group_by in df.columns:
        groups = df[req.group_by].astype(str).tolist()
        by_group = analyze_by_group(responses, groups)

    return {
        "general": general,
        "by_group": by_group,
        "config": {
            "file": meta["filename"],
            "response_column": req.response_column,
            "filters": req.filters or {},
            "group_by": req.group_by,
            "total_rows_after_filter": len(responses),
        },
    }