import os
import httpx
from typing import Dict, Any, Optional


OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:8b")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


def _call_ollama(prompt: str) -> str:
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 2000,
                    "num_ctx": 4096,
                },
            },
            timeout=300.0,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")
    except httpx.ConnectError:
        raise RuntimeError(
            "No se pudo conectar con Ollama. "
            "Asegúrate de que esté corriendo."
        )
    except httpx.ReadTimeout:
        raise RuntimeError(
            "Ollama tardó demasiado. Intenta con un prompt más corto "
            "o un modelo más rápido (ollama pull llama3.2:3b)."
        )
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Error de Ollama: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        raise RuntimeError(f"Error Ollama: {str(e)}")


def _call_anthropic(prompt: str) -> str:
    from anthropic import Anthropic
    client = Anthropic(api_key=ANTHROPIC_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _call_llm(prompt: str) -> str:
    errors = []

    try:
        result = _call_ollama(prompt)
        if result.strip():
            return result
    except Exception as e:
        errors.append(f"Ollama: {str(e)}")

    if ANTHROPIC_KEY:
        try:
            return _call_anthropic(prompt)
        except Exception as e:
            errors.append(f"Anthropic: {str(e)}")

    error_details = " | ".join(errors)
    raise RuntimeError(f"No se pudo generar el resumen. Errores: {error_details}. "
        "Opciones: 1) Verifica que Ollama esté corriendo, "
        "2) Configura ANTHROPIC_API_KEY con créditos.")


def _compact_dept(name: str, data: Dict[str, Any]) -> str:
    """Resumen MUY compacto de un departamento (para que quepa en contexto pequeño)."""
    s = data["summary"]
    sent = data["sentiment"]
    total = s["valid_responses"] or 1
    pos = round((sent["positivo"] / total) * 100)
    neg = round((sent["negativo"] / total) * 100)

    words = ", ".join([w["word"] for w in data["top_words"][:5]])

    line = f"- {name}: {s['valid_responses']} resp, {pos}% pos, {neg}% neg. Palabras: {words}"

    if data.get("suggestions"):
        line += f". {len(data['suggestions'])} sugerencias"

    return line


def generate_general_summary(
    general_data: Dict[str, Any],
    by_group: Optional[Dict[str, Dict[str, Any]]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> str:
    s = general_data["summary"]
    sent = general_data["sentiment"]
    total = s["valid_responses"] or 1
    pos_pct = round((sent["positivo"] / total) * 100)
    neg_pct = round((sent["negativo"] / total) * 100)
    neu_pct = round((sent["neutro"] / total) * 100)

    words = ", ".join([w["word"] for w in general_data["top_words"][:8]])
    phrases = ", ".join([p["phrase"] for p in general_data.get("top_trigrams", general_data.get("top_phrases", []))[:5]])

    # Ejemplos cortos
    pos_ex = ""
    if general_data["highlights"]["positive"]:
        pos_ex = general_data["highlights"]["positive"][0][:150]
    neg_ex = ""
    if general_data["highlights"]["negative"]:
        neg_ex = general_data["highlights"]["negative"][0][:150]

    # Departamentos compactos (solo top 8)
    dept_lines = ""
    if by_group:
        sorted_depts = sorted(
            by_group.items(),
            key=lambda x: x[1]["summary"]["valid_responses"],
            reverse=True,
        )[:8]
        dept_lines = "\n".join([_compact_dept(n, d) for n, d in sorted_depts])

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
    s = dept_data["summary"]
    sent = dept_data["sentiment"]
    total = s["valid_responses"] or 1
    pos_pct = round((sent["positivo"] / total) * 100)
    neg_pct = round((sent["negativo"] / total) * 100)

    words = ", ".join([w["word"] for w in dept_data["top_words"][:6]])
    names = ", ".join([n["name"] for n in dept_data.get("top_names", [])[:3]])

    pos_ex = dept_data["highlights"]["positive"][0][:150] if dept_data["highlights"]["positive"] else "N/A"
    neg_ex = dept_data["highlights"]["negative"][0][:150] if dept_data["highlights"]["negative"] else "N/A"

    gen_ctx = ""
    if general_data:
        g = general_data["sentiment"]
        gt = general_data["summary"]["valid_responses"] or 1
        gen_ctx = f"Promedio institucional: {round((g['positivo']/gt)*100)}% positivo, {round((g['negativo']/gt)*100)}% negativo."

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