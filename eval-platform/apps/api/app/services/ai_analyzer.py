"""
AI Analyzer — generates executive summaries using Claude or Ollama.

Priority order:
  1. Ollama (local LLM) — free, requires Ollama running on the server
  2. Anthropic Claude API — requires ANTHROPIC_API_KEY, ~$0.01 per summary

Supports two analysis formats:
  - Legacy: single qualitative question  (generate_general_summary / generate_department_summary)
  - Multi:  Phase 2 multi-question format (generate_multi_summary)
"""

import os
from typing import Any, Dict, List, Optional

import httpx


# ── LLM backends ──────────────────────────────────────────────────────────────

def _ollama_url() -> str:
    return os.environ.get("OLLAMA_URL", "http://localhost:11434")

def _ollama_model() -> str:
    return os.environ.get("OLLAMA_MODEL", "llama3.1:8b")

def _anthropic_key() -> str:
    """Read the Anthropic key at call time (not import time) so pydantic-settings
    values are always picked up correctly."""
    try:
        from app.core.config import settings
        return settings.ANTHROPIC_API_KEY or ""
    except Exception:
        return os.environ.get("ANTHROPIC_API_KEY", "")


def _call_ollama(prompt: str) -> str:
    try:
        response = httpx.post(
            f"{_ollama_url()}/api/generate",
            json={
                "model": _ollama_model(),
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.7, "num_predict": 2000, "num_ctx": 4096},
            },
            timeout=300.0,
        )
        response.raise_for_status()
        return response.json().get("response", "")
    except httpx.ConnectError:
        raise RuntimeError("No se pudo conectar con Ollama. Asegúrate de que esté corriendo.")
    except httpx.ReadTimeout:
        raise RuntimeError(
            "Ollama tardó demasiado. Intenta con un modelo más rápido "
            "(ollama pull llama3.2:3b)."
        )
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"Error de Ollama: {exc.response.status_code} — {exc.response.text}")
    except Exception as exc:
        raise RuntimeError(f"Error Ollama: {exc}")


def _call_anthropic(prompt: str) -> str:
    from anthropic import Anthropic
    key = _anthropic_key()
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY no configurada.")
    client = Anthropic(api_key=key)
    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _call_llm(prompt: str) -> str:
    """Try Ollama first, fall back to Anthropic, raise if both fail."""
    errors: List[str] = []

    try:
        result = _call_ollama(prompt)
        if result.strip():
            return result
    except Exception as exc:
        errors.append(f"Ollama: {exc}")

    key = _anthropic_key()
    if key:
        try:
            return _call_anthropic(prompt)
        except Exception as exc:
            errors.append(f"Anthropic: {exc}")

    raise RuntimeError(
        "No se pudo generar el resumen. "
        + " | ".join(errors)
        + ". Opciones: 1) Verifica que Ollama esté corriendo, "
        "2) Configura ANTHROPIC_API_KEY en el servidor."
    )


# ── Context builders ──────────────────────────────────────────────────────────

def _build_multi_context(questions: List[Dict], config: Dict) -> str:
    """
    Pre-process multi-question analysis data into a structured plain-text
    briefing.  Giving the LLM a compact, pre-digested summary (instead of
    raw JSON) produces much more accurate and actionable reports.
    """
    quant_qs = [q for q in questions if q["analysis_type"] == "quantitative" and q.get("quantitative")]
    qual_qs  = [q for q in questions if q["analysis_type"] == "qualitative"  and q.get("qualitative")]

    lines: List[str] = []
    filename   = config.get("file", "archivo")
    total_rows = config.get("total_rows", 0)

    lines.append(f"EVALUACIONES DOCENTES: {filename}")
    lines.append(
        f"Total filas: {total_rows:,} | "
        f"Preguntas cuantitativas: {len(quant_qs)} | "
        f"Preguntas cualitativas: {len(qual_qs)}"
    )

    # ── Quantitative table ────────────────────────────────────────────────────
    if quant_qs:
        lines += ["", "═══ RESUMEN CUANTITATIVO (escala 1–5) ═══",
                  "Pregunta | Promedio | Mediana | Desv.Est. | Respuestas"]
        for q in quant_qs:
            s = q["quantitative"]["summary"]
            lines.append(
                f"P{q['question_number']} | {s['mean']:.2f} | "
                f"{s['median']:.1f} | {s['std_dev']:.2f} | {s['valid']:,}"
            )

        # Key stats
        by_mean = sorted(quant_qs, key=lambda q: q["quantitative"]["summary"]["mean"])
        worst   = by_mean[0]
        best    = by_mean[-1]
        hi_var  = max(quant_qs, key=lambda q: q["quantitative"]["summary"]["std_dev"])

        lines += [
            "",
            f"✅ Mejor evaluada : Pregunta {best['question_number']} "
            f"(promedio {best['quantitative']['summary']['mean']:.2f})",
            f"⚠️  Peor evaluada  : Pregunta {worst['question_number']} "
            f"(promedio {worst['quantitative']['summary']['mean']:.2f})",
            f"📊 Más polarizada  : Pregunta {hi_var['question_number']} "
            f"(desv.est. {hi_var['quantitative']['summary']['std_dev']:.2f} — opiniones divididas)",
        ]

        # Alarm: questions where >15 % of responses are 1 or 2
        for q in quant_qs:
            d = q["quantitative"]["distribution"]
            low_pct = d.get("1", {}).get("pct", 0) + d.get("2", {}).get("pct", 0)
            if low_pct > 15:
                lines.append(
                    f"🔴 Alerta P{q['question_number']}: "
                    f"{low_pct:.0f}% de calificaciones bajas (1–2)"
                )

        # ── Cross-department comparison ───────────────────────────────────────
        if any(q.get("by_group") for q in quant_qs):
            lines += ["", "═══ PROMEDIO POR DEPARTAMENTO ═══"]

            all_depts: set = set()
            for q in quant_qs:
                if q.get("by_group"):
                    all_depts.update(q["by_group"].keys())

            dept_avgs: Dict[str, float] = {}
            for dept in all_depts:
                means = []
                for q in quant_qs:
                    gd = (q.get("by_group") or {}).get(dept, {})
                    m = gd.get("summary", {}).get("mean")
                    if m is not None:
                        means.append(m)
                if means:
                    dept_avgs[dept] = sum(means) / len(means)

            ranked = sorted(dept_avgs.items(), key=lambda x: x[1], reverse=True)
            for dept, avg in ranked[:10]:
                bar = "█" * int(avg * 2)  # visual bar (max 10 chars at 5.0)
                lines.append(f"  {dept:<30} {avg:.2f}  {bar}")

            if ranked:
                lines += [
                    "",
                    f"🏆 Mejor desempeño : {ranked[0][0]} ({ranked[0][1]:.2f})",
                    f"📉 Área de atención: {ranked[-1][0]} ({ranked[-1][1]:.2f})",
                ]

    # ── Qualitative section ───────────────────────────────────────────────────
    if qual_qs:
        lines += ["", "═══ ANÁLISIS CUALITATIVO ═══"]
        for q in qual_qs:
            d    = q["qualitative"]
            s    = d["summary"]
            sent = d["sentiment"]
            total = s["valid_responses"] or 1
            pos_pct = round((sent["positivo"] / total) * 100)
            neg_pct = round((sent["negativo"] / total) * 100)
            words   = ", ".join(w["word"] for w in d["top_words"][:6])

            lines += [
                "",
                f"Pregunta {q['question_number']}: "
                f"{s['valid_responses']:,} respuestas | "
                f"{pos_pct}% positivo | {neg_pct}% negativo",
                f"  Palabras frecuentes: {words}",
            ]

            if d.get("suggestions"):
                top = " | ".join(d["suggestions"][:3])
                lines.append(f"  Sugerencias: {top}")

            if d["highlights"].get("positive"):
                ex = d["highlights"]["positive"][0][:130]
                lines.append(f'  Comentario positivo: "{ex}"')
            if d["highlights"].get("negative"):
                ex = d["highlights"]["negative"][0][:130]
                lines.append(f'  Comentario crítico : "{ex}"')

    return "\n".join(lines)


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_multi_summary(
    questions: List[Dict[str, Any]],
    config: Dict[str, Any],
) -> str:
    """
    Generate an executive summary for a multi-question analysis result.
    Uses a pre-processed context briefing so Claude produces specific,
    data-driven insights rather than generic text.
    """
    context = _build_multi_context(questions, config)

    prompt = f"""Eres un analista experto en evaluación docente universitaria.
Analiza los siguientes datos y redacta un reporte ejecutivo en español.

{context}

Redacta el reporte con estas secciones en Markdown:

## Panorama General
(2 párrafos: estado general, nivel de satisfacción, participación de estudiantes)

## Fortalezas Detectadas
(Los 3–4 aspectos mejor evaluados — usa preguntas y promedios específicos)

## Áreas de Atención
(Los 2–3 aspectos que requieren mejora — menciona departamentos si aplica)

## Hallazgos Cualitativos
(Temas recurrentes en comentarios, sugerencias más frecuentes de estudiantes)

## Recomendaciones
(4 acciones concretas y realizables, ordenadas por prioridad)

Usa datos específicos (promedios, porcentajes, nombres de departamentos/preguntas)
para respaldar cada punto. Redacción profesional y directa. Máximo 550 palabras."""

    return _call_llm(prompt)


def generate_general_summary(
    general_data: Dict[str, Any],
    by_group: Optional[Dict[str, Dict[str, Any]]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> str:
    """Legacy: single qualitative question summary."""
    s    = general_data["summary"]
    sent = general_data["sentiment"]
    total = s["valid_responses"] or 1
    pos_pct = round((sent["positivo"] / total) * 100)
    neg_pct = round((sent["negativo"] / total) * 100)
    neu_pct = round((sent["neutro"]   / total) * 100)

    words   = ", ".join(w["word"]    for w in general_data["top_words"][:8])
    phrases = ", ".join(p["phrase"]  for p in (
        general_data.get("top_trigrams") or general_data.get("top_phrases") or []
    )[:5])

    pos_ex = (general_data["highlights"]["positive"] or [""])[0][:150]
    neg_ex = (general_data["highlights"]["negative"] or [""])[0][:150]

    dept_lines = ""
    if by_group:
        sorted_depts = sorted(
            by_group.items(),
            key=lambda x: x[1]["summary"]["valid_responses"],
            reverse=True,
        )[:8]
        dept_lines_list = []
        for name, data in sorted_depts:
            ds   = data["summary"]
            dsen = data["sentiment"]
            dt   = ds["valid_responses"] or 1
            pos  = round((dsen["positivo"] / dt) * 100)
            neg  = round((dsen["negativo"] / dt) * 100)
            wds  = ", ".join(w["word"] for w in data["top_words"][:4])
            dept_lines_list.append(
                f"- {name}: {ds['valid_responses']} resp, {pos}% pos, {neg}% neg. Palabras: {wds}"
            )
        dept_lines = "\n".join(dept_lines_list)

    prompt = f"""Analiza estas evaluaciones docentes universitarias y escribe un reporte ejecutivo en español.

DATOS GENERALES:
- {s['valid_responses']} respuestas válidas de {s['total_responses']} totales
- Sentimiento: {pos_pct}% positivo, {neu_pct}% neutro, {neg_pct}% negativo
- Palabras clave: {words}
- Frases frecuentes: {phrases}
- Ejemplo positivo: "{pos_ex}"
- Ejemplo negativo: "{neg_ex}"
- {len(general_data.get('suggestions', []))} sugerencias detectadas

{f"DEPARTAMENTOS:{chr(10)}{dept_lines}" if dept_lines else ""}

Escribe un reporte con estas secciones en Markdown:
## Panorama General
(2 párrafos sobre el estado de las evaluaciones)

## Hallazgos Principales
(4 puntos clave con datos)

## Áreas de Oportunidad
(3 puntos de mejora)

## Recomendaciones
(3 acciones concretas)

Usa español profesional y datos específicos."""

    return _call_llm(prompt)


def generate_department_summary(
    dept_name: str,
    dept_data: Dict[str, Any],
    general_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Legacy: single-department qualitative summary."""
    s    = dept_data["summary"]
    sent = dept_data["sentiment"]
    total = s["valid_responses"] or 1
    pos_pct = round((sent["positivo"] / total) * 100)
    neg_pct = round((sent["negativo"] / total) * 100)

    words = ", ".join(w["word"] for w in dept_data["top_words"][:6])
    names = ", ".join(n["name"] for n in dept_data.get("top_names", [])[:3])
    pos_ex = (dept_data["highlights"]["positive"] or ["N/A"])[0][:150]
    neg_ex = (dept_data["highlights"]["negative"] or ["N/A"])[0][:150]

    gen_ctx = ""
    if general_data:
        g  = general_data["sentiment"]
        gt = general_data["summary"]["valid_responses"] or 1
        gen_ctx = (
            f"Promedio institucional: "
            f"{round((g['positivo']/gt)*100)}% positivo, "
            f"{round((g['negativo']/gt)*100)}% negativo."
        )

    prompt = f"""Genera un reporte del departamento "{dept_name}" de una universidad.

DATOS:
- {s['valid_responses']} respuestas, {pos_pct}% positivo, {neg_pct}% negativo
- Palabras clave: {words}
{f'- Nombres mencionados: {names}' if names else ''}
- Ejemplo positivo: "{pos_ex}"
- Ejemplo negativo: "{neg_ex}"
- {len(dept_data.get('suggestions', []))} sugerencias
{gen_ctx}

Escribe en español con Markdown:
## Resumen
(1 párrafo, compara con promedio institucional)

## Fortalezas
(lo que valoran los estudiantes)

## Áreas de Mejora
(problemas identificados)

## Recomendaciones
(3 acciones concretas)

Sé específico y profesional. 300 palabras máximo."""

    return _call_llm(prompt)
