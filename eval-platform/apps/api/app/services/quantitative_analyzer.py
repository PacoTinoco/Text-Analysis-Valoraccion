"""
Servicio de análisis cuantitativo para respuestas numéricas (escala 1-5).
"""

import statistics
from typing import List, Dict, Any, Optional
from collections import Counter


def analyze_quantitative(responses: List[str]) -> Dict[str, Any]:
    """
    Analiza respuestas numéricas (escala 1-5).
    Recibe strings y los convierte a float, ignorando valores inválidos.
    """
    # Convertir a números, filtrar inválidos
    valid_values: List[float] = []
    invalid_count = 0

    for r in responses:
        try:
            val = float(str(r).strip())
            if 1 <= val <= 5:
                valid_values.append(val)
            else:
                invalid_count += 1
        except (ValueError, TypeError):
            invalid_count += 1

    total = len(responses)
    valid = len(valid_values)

    if valid == 0:
        return {
            "summary": {
                "total": total,
                "valid": 0,
                "invalid": invalid_count,
                "mean": 0,
                "median": 0,
                "std_dev": 0,
                "min": 0,
                "max": 0,
            },
            "distribution": {
                str(i): {"count": 0, "pct": 0} for i in range(1, 6)
            },
        }

    # Estadísticas básicas
    mean_val = round(statistics.mean(valid_values), 2)
    median_val = round(statistics.median(valid_values), 2)
    std_dev = round(statistics.stdev(valid_values), 2) if valid > 1 else 0
    min_val = min(valid_values)
    max_val = max(valid_values)

    # Distribución de frecuencias (1-5)
    counts = Counter(int(v) for v in valid_values)
    distribution = {}
    for i in range(1, 6):
        c = counts.get(i, 0)
        distribution[str(i)] = {
            "count": c,
            "pct": round((c / valid) * 100, 1) if valid > 0 else 0,
        }

    return {
        "summary": {
            "total": total,
            "valid": valid,
            "invalid": invalid_count,
            "mean": mean_val,
            "median": median_val,
            "std_dev": std_dev,
            "min": min_val,
            "max": max_val,
        },
        "distribution": distribution,
    }


def analyze_quantitative_by_group(
    responses: List[str],
    groups: List[str],
) -> Dict[str, Dict[str, Any]]:
    """
    Analiza respuestas numéricas agrupadas (ej: por departamento).
    responses y groups deben tener la misma longitud.
    """
    if len(responses) != len(groups):
        raise ValueError("responses y groups deben tener la misma longitud")

    # Agrupar respuestas por grupo
    grouped: Dict[str, List[str]] = {}
    for resp, group in zip(responses, groups):
        group_key = str(group).strip()
        if group_key not in grouped:
            grouped[group_key] = []
        grouped[group_key].append(resp)

    # Analizar cada grupo
    results = {}
    for group_name, group_responses in sorted(grouped.items()):
        results[group_name] = analyze_quantitative(group_responses)

    return results
