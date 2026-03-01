import asyncio
import os
from functools import partial
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.cache import cache_get, cache_set
from app.core.config import settings
from app.core.storage import ensure_local
from app.services.quantitative_analyzer import (
    analyze_quantitative,
    analyze_quantitative_by_group,
)
from app.services.text_analyzer import analyze_by_group, analyze_responses, search_responses

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────

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


# ── Internal helpers ───────────────────────────────────────────────────────────

def _get_file_meta(file_id: str) -> dict:
    """Fetch file metadata from the shared cache or raise 404."""
    meta = cache_get(f"file:{file_id}")
    if not meta:
        raise HTTPException(
            404,
            "Archivo no encontrado. Es posible que haya expirado — vuelve a subirlo.",
        )
    return meta


def _read_dataframe(filepath: str) -> pd.DataFrame:
    """Load a file from disk (runs in a thread pool)."""
    ext = os.path.splitext(filepath)[1].lower()
    return pd.read_csv(filepath, low_memory=False) if ext == ".csv" else pd.read_excel(filepath)


def _apply_filters(df: pd.DataFrame, filters: Optional[Dict[str, List[str]]]) -> pd.DataFrame:
    if filters:
        for col_name, values in filters.items():
            if col_name in df.columns and values:
                df = df[df[col_name].astype(str).isin(values)]
    return df


def _extract_known_names(df: pd.DataFrame) -> Optional[set]:
    if "EVALUADO" not in df.columns:
        return None
    known = set()
    for full_name in df["EVALUADO"].dropna().unique().tolist():
        for part in str(full_name).strip().split():
            if len(part) > 2:
                known.add(part.capitalize())
    return known


async def _load_df(filepath: str, file_id: str) -> pd.DataFrame:
    """
    Non-blocking DataFrame load — heavy I/O runs in a thread pool.
    If the file is missing locally (e.g. container restarted), tries to
    restore it from S3 before raising an error.
    """
    if not os.path.exists(filepath):
        # Attempt to restore from S3
        if not ensure_local(filepath, file_id):
            raise HTTPException(
                404,
                "Archivo no encontrado en el servidor. "
                "Si fue subido hace más de 2 horas vuelve a cargarlo.",
            )
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_read_dataframe, filepath))


def _run_qualitative(df, response_col, group_by, known_names):
    """Synchronous qualitative analysis (called inside run_in_executor)."""
    responses = df[response_col].astype(str).tolist()
    general = analyze_responses(responses, known_names)
    by_group = None
    if group_by and group_by in df.columns:
        groups = df[group_by].astype(str).tolist()
        by_group = analyze_by_group(responses, groups, known_names)
    return general, by_group, responses


def _run_multi_analysis(df, req_dict):
    """
    Run all question analyses synchronously.
    Called via run_in_executor so it doesn't block the event loop.
    """
    pregunta_col = req_dict["pregunta_column"]
    respuesta_col = req_dict["respuesta_column"]
    group_by = req_dict.get("group_by")
    questions = req_dict["questions"]

    known_names = _extract_known_names(df)
    results: List[Dict[str, Any]] = []

    for q in questions:
        q_num = str(q["question_number"]).strip()
        q_type = q["analysis_type"]

        q_df = df[df[pregunta_col].astype(str).str.strip() == q_num]
        q_df = q_df[q_df[respuesta_col].notna()]
        responses = q_df[respuesta_col].astype(str).tolist()

        q_result: Dict[str, Any] = {
            "question_number": q_num,
            "analysis_type": q_type,
            "total_responses": len(responses),
            "quantitative": None,
            "qualitative": None,
            "by_group": None,
        }

        if not responses:
            results.append(q_result)
            continue

        if q_type == "quantitative":
            q_result["quantitative"] = analyze_quantitative(responses)
            if group_by and group_by in q_df.columns:
                groups = q_df[group_by].astype(str).tolist()
                q_result["by_group"] = analyze_quantitative_by_group(responses, groups)

        elif q_type == "qualitative":
            q_result["qualitative"] = analyze_responses(responses, known_names)
            if group_by and group_by in q_df.columns:
                groups = q_df[group_by].astype(str).tolist()
                q_result["by_group"] = analyze_by_group(responses, groups, known_names)

        results.append(q_result)

    return results


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def run_analysis(req: AnalyzeRequest):
    meta = _get_file_meta(req.file_id)
    df = await _load_df(meta["filepath"], req.file_id)

    if req.response_column not in df.columns:
        raise HTTPException(400, f"Columna '{req.response_column}' no existe")

    df = _apply_filters(df, req.filters)
    df = df[df[req.response_column].notna()]

    if df.empty:
        raise HTTPException(400, "No hay respuestas con los filtros seleccionados.")

    known_names = _extract_known_names(df)

    # Run analysis in thread pool (CPU-bound)
    loop = asyncio.get_event_loop()
    general, by_group, responses = await loop.run_in_executor(
        None,
        partial(_run_qualitative, df, req.response_column, req.group_by, known_names),
    )

    result = {
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

    # Cache for AI summary reuse
    cache_set(f"analysis:{req.file_id}", result, ttl=settings.CACHE_TTL_ANALYSIS)
    return result


@router.post("/multi-analyze")
async def multi_analyze(req: MultiAnalyzeRequest):
    meta = _get_file_meta(req.file_id)
    df = await _load_df(meta["filepath"], req.file_id)

    if req.pregunta_column not in df.columns:
        raise HTTPException(400, f"Columna '{req.pregunta_column}' no existe")
    if req.respuesta_column not in df.columns:
        raise HTTPException(400, f"Columna '{req.respuesta_column}' no existe")

    df = _apply_filters(df, req.filters)

    # Run all question analyses in a single thread-pool call to avoid
    # repeated executor overhead and keep pandas operations serialised.
    loop = asyncio.get_event_loop()
    req_dict = {
        "pregunta_column": req.pregunta_column,
        "respuesta_column": req.respuesta_column,
        "group_by": req.group_by,
        "questions": [q.model_dump() for q in req.questions],
    }
    questions_results = await loop.run_in_executor(
        None, partial(_run_multi_analysis, df, req_dict)
    )

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

    # Cache for AI summary reuse
    cache_set(f"analysis:{req.file_id}", result, ttl=settings.CACHE_TTL_ANALYSIS)
    return result


@router.post("/drilldown")
async def drilldown(req: DrilldownRequest):
    meta = _get_file_meta(req.file_id)
    df = await _load_df(meta["filepath"], req.file_id)

    if req.response_column not in df.columns:
        raise HTTPException(400, f"Columna '{req.response_column}' no existe")

    df = _apply_filters(df, req.filters)

    if req.department and "DEPARTAMENTO" in df.columns:
        df = df[df["DEPARTAMENTO"].astype(str) == req.department]

    df = df[df[req.response_column].notna()]

    if df.empty:
        raise HTTPException(400, "No hay respuestas con los filtros seleccionados.")

    responses = df[req.response_column].astype(str).tolist()

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, partial(search_responses, responses, req.query, req.limit or 50)
    )
    return result


@router.post("/ai-summary")
async def ai_summary(req: AISummaryRequest):
    try:
        from app.services.ai_analyzer import (
            generate_department_summary,
            generate_general_summary,
            generate_multi_summary,
        )
    except Exception as exc:
        raise HTTPException(500, f"Error al cargar el módulo de IA: {exc}")

    # Look up cached analysis results
    cached = cache_get(f"analysis:{req.file_id}")
    if not cached:
        raise HTTPException(
            404,
            "Primero ejecuta el análisis antes de generar el resumen IA.",
        )

    # Detect format: multi-question (Phase 2) vs legacy (single qualitative)
    is_multi = isinstance(cached.get("questions"), list)

    try:
        if is_multi:
            # Multi-question format — use the rich context builder
            # run_in_executor so the blocking LLM call doesn't stall the event loop
            loop = asyncio.get_event_loop()
            summary = await loop.run_in_executor(
                None,
                partial(
                    generate_multi_summary,
                    cached["questions"],
                    cached.get("config", {}),
                ),
            )
        elif req.department:
            # Legacy: per-department qualitative summary
            by_group = cached.get("by_group") or {}
            if req.department not in by_group:
                raise HTTPException(404, f"Departamento '{req.department}' no encontrado")
            loop = asyncio.get_event_loop()
            summary = await loop.run_in_executor(
                None,
                partial(
                    generate_department_summary,
                    req.department,
                    by_group[req.department],
                    cached.get("general"),
                ),
            )
        else:
            # Legacy: general qualitative summary
            loop = asyncio.get_event_loop()
            summary = await loop.run_in_executor(
                None,
                partial(
                    generate_general_summary,
                    cached.get("general"),
                    cached.get("by_group"),
                    cached.get("config"),
                ),
            )

        return {"summary": summary, "department": req.department}

    except RuntimeError as exc:
        raise HTTPException(400, str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Error al generar resumen IA: {exc}")
