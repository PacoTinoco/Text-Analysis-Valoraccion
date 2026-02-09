import re
from collections import Counter
from typing import List, Dict, Any


# Stopwords en español
STOPWORDS = {
    "de", "la", "que", "el", "en", "y", "a", "los", "del", "se", "las", "por",
    "un", "para", "con", "no", "una", "su", "al", "lo", "como", "más", "pero",
    "sus", "le", "ya", "o", "este", "sí", "porque", "esta", "entre", "cuando",
    "muy", "sin", "sobre", "también", "me", "hasta", "hay", "donde", "quien",
    "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra",
    "otros", "ese", "eso", "ante", "ellos", "e", "esto", "mí", "antes",
    "algunos", "qué", "unos", "yo", "otro", "otras", "otra", "él", "tanto",
    "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual", "poco",
    "ella", "estar", "estas", "algunas", "algo", "nosotros", "mi", "mis",
    "tú", "te", "ti", "tu", "tus", "ellas", "nosotras", "vosotros",
    "vosotras", "os", "mío", "mía", "míos", "mías", "tuyo", "tuya",
    "tuyos", "tuyas", "suyo", "suya", "suyos", "suyas", "nuestro",
    "nuestra", "nuestros", "nuestras", "vuestro", "vuestra", "vuestros",
    "vuestras", "esos", "esas", "estoy", "estás", "está", "estamos",
    "estáis", "están", "esté", "estés", "estemos", "estéis", "estén",
    "estaré", "estarás", "estará", "estaremos", "estaréis", "estarán",
    "estaría", "estarías", "estaríamos", "estaríais", "estarían",
    "estaba", "estabas", "estábamos", "estabais", "estaban", "estuve",
    "estuviste", "estuvo", "estuvimos", "estuvisteis", "estuvieron",
    "he", "has", "ha", "hemos", "habéis", "han", "haya", "hayas",
    "hayamos", "hayáis", "hayan", "habré", "habrás", "habrá",
    "habremos", "habréis", "habrán", "habría", "habrías", "habríamos",
    "habríais", "habrían", "había", "habías", "habíamos", "habíais",
    "habían", "hube", "hubiste", "hubo", "hubimos", "hubisteis",
    "hubieron", "ser", "soy", "eres", "es", "somos", "sois", "son",
    "sea", "seas", "seamos", "seáis", "sean", "seré", "serás", "será",
    "seremos", "seréis", "serán", "sería", "serías", "seríamos",
    "seríais", "serían", "era", "eras", "éramos", "erais", "eran",
    "fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron", "sido",
    "tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen",
    "haber", "tener", "hacer", "cada", "ir", "bien", "así", "puede",
    "ver", "dan", "da", "das", "van", "fue", "han", "sido",
    "creo", "solo", "tan", "eso", "vez", "hace", "si", "mas", "ese",
    "mucha", "muchas", "muchos", "buena", "bueno", "buenos", "buenas",
    "mejor", "da", "dan", "dio", "dieron", "hizo", "hicieron",
    "pues", "aquí", "ahí", "allí", "entonces", "después", "luego",
    "siempre", "nunca", "aún", "todavía", "además", "aunque", "sino",
    "cual", "cuales", "donde", "manera", "forma", "parte", "lado",
    "igual", "ser", "estar", "haber", "ir", "dar", "decir", "poder",
    "querer", "deber", "saber", "poner", "venir", "salir", "llegar",
    "pasar", "seguir", "encontrar", "pensar", "llevar", "dejar",
    "hablar", "llamar", "volver", "tomar", "conocer", "vivir",
    "sentir", "tratar", "mirar", "contar", "empezar", "esperar",
    "buscar", "existir", "entrar", "trabajar", "escribir", "perder",
    "producir", "ocurrir", "entender", "pedir", "recibir", "recordar",
    "terminar", "permitir", "aparecer", "conseguir", "comenzar",
    "servir", "sacar", "necesitar", "mantener", "resultar", "leer",
    "caer", "cambiar", "presentar", "crear", "abrir", "considerar",
    "oír", "acabar", "convertir", "ganar", "formar", "traer",
    "partir", "morir", "aceptar", "realizar", "suponer", "comprender",
}

# Palabras positivas y negativas para sentiment básico
POSITIVE_WORDS = {
    "excelente", "increíble", "extraordinario", "maravilloso", "fantástico",
    "genial", "perfecto", "recomiendo", "encanta", "encantó", "inspirador",
    "inspiradora", "motivador", "motivadora", "aprendí", "aprendido",
    "agradezco", "agradecido", "agradecida", "gracias", "satisfecho",
    "satisfecha", "contento", "contenta", "feliz", "útil", "valioso",
    "valiosa", "interesante", "interesantes", "dinámico", "dinámica",
    "claro", "clara", "paciente", "dedicado", "dedicada", "pasión",
    "pasionado", "profesional", "preparado", "preparada", "dominio",
    "conocimiento", "disfruto", "disfruté", "impactante", "enriquecedor",
    "enriquecedora", "recomendable", "destacar", "destaca", "admirable",
    "comprometido", "comprometida", "accesible", "disponible", "amable",
    "respetuoso", "respetuosa", "creativo", "creativa", "innovador",
    "innovadora", "práctico", "práctica", "relevante", "significativo",
    "significativa", "transformador", "transformadora",
}

NEGATIVE_WORDS = {
    "malo", "mala", "pésimo", "pésima", "terrible", "horrible", "aburrido",
    "aburrida", "confuso", "confusa", "difícil", "complicado", "complicada",
    "desorganizado", "desorganizada", "injusto", "injusta", "frustrante",
    "decepcionante", "decepcionado", "decepcionada", "insatisfecho",
    "insatisfecha", "inadecuado", "inadecuada", "deficiente", "mediocre",
    "lento", "lenta", "pesado", "pesada", "monótono", "monótona",
    "incomprensible", "impuntual", "irrespetuoso", "irrespetuosa",
    "negligente", "desinteresado", "desinteresada", "inaccesible",
    "mejorar", "mejore", "falta", "faltó", "carece", "problema",
    "problemas", "queja", "quejas", "molesto", "molesta",
}

SUGGESTION_PATTERNS = [
    r"(?:me gustaría|sería bueno|sugiero|sugeriría|recomendaría|debería|podría|ojalá|faltó|falta|necesita|hace falta)",
    r"(?:sería mejor|cambiar|modificar|mejorar|agregar|incluir|más de|menos de)",
]


def clean_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"_x000d_\\n|_x000d_|\r\n|\r|\n", " ", text)
    text = re.sub(r"[^\w\sáéíóúñü]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text: str) -> List[str]:
    words = clean_text(text).split()
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def get_bigrams(tokens: List[str]) -> List[str]:
    return [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]


def classify_sentiment(text: str) -> str:
    cleaned = clean_text(text)
    words = set(cleaned.split())
    pos = len(words & POSITIVE_WORDS)
    neg = len(words & NEGATIVE_WORDS)
    if pos > neg:
        return "positivo"
    elif neg > pos:
        return "negativo"
    return "neutro"


def is_suggestion(text: str) -> bool:
    cleaned = clean_text(text)
    for pattern in SUGGESTION_PATTERNS:
        if re.search(pattern, cleaned):
            return True
    return False


def analyze_responses(responses: List[str]) -> Dict[str, Any]:
    if not responses:
        return {"error": "No hay respuestas para analizar"}

    # Filtrar respuestas vacías y muy cortas
    valid = [r for r in responses if isinstance(r, str) and len(r.strip()) >= 10]
    short = [r for r in responses if isinstance(r, str) and 0 < len(r.strip()) < 10]

    # Tokenizar todo
    all_tokens = []
    all_bigrams = []
    sentiments = {"positivo": 0, "negativo": 0, "neutro": 0}
    suggestions = []
    lengths = []
    highlights_positive = []
    highlights_negative = []

    for resp in valid:
        tokens = tokenize(resp)
        all_tokens.extend(tokens)
        all_bigrams.extend(get_bigrams(tokens))

        sentiment = classify_sentiment(resp)
        sentiments[sentiment] += 1

        if is_suggestion(resp):
            suggestions.append(resp)

        lengths.append(len(resp))

        if sentiment == "positivo" and len(resp) > 80:
            highlights_positive.append(resp)
        elif sentiment == "negativo" and len(resp) > 80:
            highlights_negative.append(resp)

    # Frecuencias
    word_freq = Counter(all_tokens).most_common(30)
    bigram_freq = Counter(all_bigrams).most_common(20)

    # Promedios
    avg_length = sum(lengths) / len(lengths) if lengths else 0

    # Seleccionar highlights representativos
    highlights_positive.sort(key=len, reverse=True)
    highlights_negative.sort(key=len, reverse=True)
    suggestions.sort(key=len, reverse=True)

    return {
        "summary": {
            "total_responses": len(responses),
            "valid_responses": len(valid),
            "short_responses": len(short),
            "avg_length": round(avg_length, 1),
        },
        "sentiment": sentiments,
        "top_words": [{"word": w, "count": c} for w, c in word_freq],
        "top_phrases": [{"phrase": p, "count": c} for p, c in bigram_freq],
        "suggestions": suggestions[:15],
        "highlights": {
            "positive": highlights_positive[:10],
            "negative": highlights_negative[:10],
        },
    }


def analyze_by_group(
    responses: List[str],
    groups: List[str],
) -> Dict[str, Dict[str, Any]]:
    """Analiza respuestas agrupadas por un campo (ej: departamento)."""
    grouped: Dict[str, List[str]] = {}
    for resp, group in zip(responses, groups):
        if group not in grouped:
            grouped[group] = []
        grouped[group].append(resp)

    results = {}
    for group_name, group_responses in sorted(grouped.items()):
        results[group_name] = analyze_responses(group_responses)

    return results