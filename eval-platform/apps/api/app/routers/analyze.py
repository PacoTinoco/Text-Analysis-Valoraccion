import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from app.routers.upload import uploaded_files
from app.services.text_analyzer import analyze_responses, analyze_by_group, search_responses
from app.services.quantitative_analyzer import analyze_quantitative, analyze_quantitative_by_group

router = APIRouter()

# Cache de resultados de análisis para reutilizar en AI
analysis_cache: Dict[str, Dict] = {}


class AnalyzeRequest(BaseModel):
    file_id: str
    response_column: str
    filters: Optional[Dict[str, List[str]]] = None
    group_by: Optional[str] = None


class DrilldownRequest(BaseModel):
    file_id: str
    response_column: str
    query: str
    filters: Optional[Dict[str, List[str]]] = None
    department: Optional[str] = None
    limit: Optional[int] = 50


class AISummaryRequest(BaseModel):
    file_id: str
    department: Optional[str] = None


# --- Modelos para multi-analyze (Fase 2) ---

class QuestionConfig(BaseModel):
    question_number: str
    analysis_type: str  # "quantitative" | "qualitative"


class MultiAnalyzeRequest(BaseModel):
    file_id: str
    pregunta_column: str
    respuesta_column: str
    questions: List[QuestionConfig]
    filters: Optional[Dict[str, List[str]]] = None
    group_by: Optional[str] = None


def load_and_filter(
    file_id: str,
    response_column: str,
    filters: Optional[Dict[str, List[str]]] = None,
    department: Optional[str] = None,
) -> pd.DataFrame:
    if file_id not in uploaded_files:
        raise HTTPException(404, "Archivo no encontrado. Vuelve a subirlo.")

    meta = uploaded_files[file_id]
    filepath = meta["filepath"]

    if not os.path.exists(filepath):
        raise HTTPException(404, "Archivo ya no existe en el servidor.")

    ext = os.path.splitext(filepath)[1].lower()
    df = pd.read_csv(filepath, low_memory=False) if ext == ".csv" else pd.read_excel(filepath)

    if response_column not in df.columns:
        raise HTTPException(400, f"Columna '{response_column}' no existe")

    if filters:
        for col_name, values in filters.items():
            if col_name in df.columns and values:
                df = df[df[col_name].astype(str).isin(values)]

    if department and "DEPARTAMENTO" in df.columns:
        df = df[df["DEPARTAMENTO"].astype(str) == department]

    df = df[df[response_column].notna()]
    return df


@router.post("/analyze")
async def run_analysis(req: AnalyzeRequest):
    df = load_and_filter(req.file_id, req.response_column, req.filters)
    responses = df[req.response_column].astype(str).tolist()

    if len(responses) == 0:
        raise HTTPException(400, "No hay respuestas con los filtros seleccionados.")

    known_names = None
    if "EVALUADO" in df.columns:
        raw_names = df["EVALUADO"].dropna().unique().tolist()
        known_names = set()
        for full_name in raw_names:
            parts = str(full_name).strip().split()
            for part in parts:
                if len(part) > 2:
                    known_names.add(part.capitalize())

    general = analyze_responses(responses, known_names)

    by_group = None
    if req.group_by and req.group_by in df.columns:
        groups = df[req.group_by].astype(str).tolist()
        by_group = analyze_by_group(responses, groups, known_names)

    result = {
        "general": general,
        "by_group": by_group,
        "config": {
            "file": uploaded_files[req.file_id]["filename"],
            "response_column": req.response_column,
            "filters": req.filters or {},
            "group_by": req.group_by,
            "total_rows_after_filter": len(responses),
        },
    }

    # Cache para usar en AI summary
    analysis_cache[req.file_id] = result

    return result


@router.post("/multi-analyze")
async def multi_analyze(req: MultiAnalyzeRequest):
    """
    Analiza múltiples preguntas (cuantitativas y/o cualitativas) en una sola petición.
    Filtra por número de pregunta y ejecuta el análisis correspondiente.
    """
    if req.file_id not in uploaded_files:
        raise HTTPException(404, "Archivo no encontrado. Vuelve a subirlo.")

    meta = uploaded_files[req.file_id]
    filepath = meta["filepath"]

    if not os.path.exists(filepath):
        raise HTTPException(404, "Archivo ya no existe en el servidor.")

    ext = os.path.splitext(filepath)[1].lower()
    df = pd.read_csv(filepath, low_memory=False) if ext == ".csv" else pd.read_excel(filepath)

    # Validar columnas
    if req.pregunta_column not in df.columns:
        raise HTTPException(400, f"Columna '{req.pregunta_column}' no existe")
    if req.respuesta_column not in df.columns:
        raise HTTPException(400, f"Columna '{req.respuesta_column}' no existe")

    # Aplicar filtros globales
    if req.filters:
        for col_name, values in req.filters.items():
            if col_name in df.columns and values:
                df = df[df[col_name].astype(str).isin(values)]

    # Extraer nombres conocidos (para análisis cualitativo)
    known_names = None
    if "EVALUADO" in df.columns:
        raw_names = df["EVALUADO"].dropna().unique().tolist()
        known_names = set()
        for full_name in raw_names:
            parts = str(full_name).strip().split()
            for part in parts:
                if len(part) > 2:
                    known_names.add(part.capitalize())

    # Analizar cada pregunta
    questions_results: List[Dict[str, Any]] = []

    for q in req.questions:
        # Filtrar filas de esta pregunta
        q_df = df[df[req.pregunta_column].astype(str).str.strip() == str(q.question_number).strip()]
        q_df = q_df[q_df[req.respuesta_column].notna()]
        responses = q_df[req.respuesta_column].astype(str).tolist()

        q_result: Dict[str, Any] = {
            "question_number": q.question_number,
            "analysis_type": q.analysis_type,
            "total_responses": len(responses),
            "quantitative": None,
            "qualitative": None,
            "by_group": None,
        }

        if len(responses) == 0:
            questions_results.append(q_result)
            continue

        if q.analysis_type == "quantitative":
            q_result["quantitative"] = analyze_quantitative(responses)

            # Análisis agrupado cuantitativo
            if req.group_by and req.group_by in q_df.columns:
                groups = q_df[req.group_by].astype(str).tolist()
                q_result["by_group"] = analyze_quantitative_by_group(responses, groups)

        elif q.analysis_type == "qualitative":
            q_result["qualitative"] = analyze_responses(responses, known_names)

            # Análisis agrupado cualitativo
            if req.group_by and req.group_by in q_df.columns:
                groups = q_df[req.group_by].astype(str).tolist()
                q_result["by_group"] = analyze_by_group(responses, groups, known_names)

        questions_results.append(q_result)

    result = {
        "questions": questions_results,
        "config": {
            "file": meta["filename"],
            "pregunta_column": req.pregunta_column,
            "respuesta_column": req.respuesta_column,
            "questions_config": [q.model_dump() for q in req.questions],
            "filters": req.filters or {},
            "group_by": req.group_by,
            "total_rows": len(df),
        },
    }

    # Cache para AI summary
    analysis_cache[req.file_id] = result

    return result


@router.post("/drilldown")
async def drilldown(req: DrilldownRequest):
    df = load_and_filter(req.file_id, req.response_column, req.filters, req.department)
    responses = df[req.response_column].astype(str).tolist()

    if len(responses) == 0:
        raise HTTPException(400, "No hay respuestas con los filtros seleccionados.")

    result = search_responses(responses, req.query, req.limit or 50)
    return result


@router.post("/ai-summary")
async def ai_summary(req: AISummaryRequest):
    """Genera un resumen inteligente usando Claude API."""
    # Importar aquí para no fallar si no tiene API key
    try:
        from app.services.ai_analyzer import (
            generate_general_summary,
            generate_department_summary,
        )
    except Exception as e:
        raise HTTPException(500, f"Error al cargar el módulo de IA: {str(e)}")
    
    print(f"DEBUG ai-summary: file_id={req.file_id}, cache_keys={list(analysis_cache.keys())}")

    if req.file_id not in analysis_cache:
        raise HTTPException(
            404,
            "Primero ejecuta el análisis básico antes de generar el resumen IA.",
        )

    cached = analysis_cache[req.file_id]

    try:
        if req.department:
            # Resumen de un departamento
            by_group = cached.get("by_group", {})
            if not by_group or req.department not in by_group:
                raise HTTPException(404, f"Departamento '{req.department}' no encontrado")

            summary = generate_department_summary(
                dept_name=req.department,
                dept_data=by_group[req.department],
                general_data=cached.get("general"),
            )
        else:
            # Resumen general
            summary = generate_general_summary(
                general_data=cached["general"],
                by_group=cached.get("by_group"),
                config=cached.get("config"),
            )

        return {"summary": summary, "department": req.department}

    except RuntimeError as e:
        # API key no configurada
        raise HTTPException(
            400,
            str(e),
        )
    except Exception as e:
        raise HTTPException(500, f"Error al generar resumen IA: {str(e)}")