import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
from collections import Counter
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import nltk
from nltk.util import ngrams
from nltk.corpus import stopwords
import re
import io
from PIL import Image
import base64

# ---- Estilo para gráficas ----
px.defaults.template = "simple_white"
px.defaults.color_continuous_scale = "Blues"
px.defaults.color_discrete_sequence = px.colors.sequential.Blues


# ---------- CONFIG ----------
st.set_page_config(page_title="ValorAcción - Análisis de Texto", layout="wide", page_icon="🧠")
st.title("🧠 ValorAcción ITESO — Análisis Automático de Preguntas Abiertas")

# ---- ENCABEZADO INSTITUCIONAL ----
def header_institucional():
    # Load ITESO logo
    logo = Image.open("logo-iteso.png")

    # Convert to base64
    buffered = io.BytesIO()
    logo.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode()

    header_html = f"""
    <div style="
        background-color:#002f6c;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 30px;
    ">
        <img src="data:image/png;base64,{img_b64}" style="width:160px; margin-bottom:10px;">
        <h1 style="color:white; margin:0; font-family:'Arial'; font-size:30px;">
            ValorAcción ITESO — Análisis Automático de Preguntas Abiertas
        </h1>
        <p style="color:#e0e0e0; font-size:15px; margin-top:8px;">
            Herramienta institucional para coordinadores y departamentos académicos
        </p>
    </div>
    """
    st.markdown(header_html, unsafe_allow_html=True)

header_institucional()


st.markdown("""
**Resumen:** Sube uno o varios archivos Excel (.xlsx). Puedes seleccionar hojas por archivo, aplicar filtros dinámicos (según las columnas presentes) y generar análisis de n-gramas (1/2/3), wordclouds y ver las respuestas completas que contienen los n-gramas seleccionados.  
La app detecta automáticamente si tu dataset tiene las columnas mínimas **ASIGNATURA, PREGUNTA, RESPUESTA** (modo simple) o si además contiene columnas para filtros avanzados como **PERIODOESCOLAR, ENCUESTA_ID, DEPARTAMENTO, PROGRAMAEDUCATIVO**.
""")

st.markdown("""
<style>

/* Inputs redondeados */
input, select, textarea {
    border-radius: 6px !important;
}

/* Botones estilizados */
.stButton>button {
    background-color: #002f6c !important;
    color: white !important;
    border-radius: 6px;
    padding: 8px 20px;
}

.stButton>button:hover {
    background-color: #004b8d !important;
}

/* Dataframes con bordes suaves */
.dataframe {
    border-radius: 6px !important;
}

/* Sidebar más limpia */
section[data-testid="stSidebar"] {
    background-color: #ffffff !important;
}

</style>
""", unsafe_allow_html=True)


# ---------- Recursos de NLTK ----------
nltk.download('stopwords', quiet=True)
STOPWORDS = set(stopwords.words('spanish'))

# ---------- UTIL: limpieza ----------
def limpiar_y_tokenizar(texto):
    if pd.isna(texto):
        return []
    texto = str(texto).lower()
    texto = re.sub(r"http\S+|www\S+|https\S+", "", texto)
    texto = re.sub(r"[^a-záéíóúüñ\s]", " ", texto)
    tokens = [t for t in texto.split() if t not in STOPWORDS and len(t) > 2]
    return tokens

def texto_limpio_str(texto):
    return " ".join(limpiar_y_tokenizar(texto))

# ---------- Subida de archivos ----------
st.sidebar.header("1) Cargar archivos")
uploaded = st.sidebar.file_uploader("Sube uno o varios archivos .xlsx (acepta múltiples).", type=["xlsx"], accept_multiple_files=True)

if not uploaded:
    st.info("Sube al menos un archivo Excel (.xlsx) con las respuestas para comenzar.")
    st.stop()

# ---------- Mostrar hojas disponibles y permitir selección ----------
st.sidebar.header("2) Seleccionar hojas a incluir")
files_sheets = {}
for f in uploaded:
    try:
        xls = pd.ExcelFile(f)
        files_sheets[f.name] = xls.sheet_names
    except Exception as e:
        st.sidebar.error(f"Error leyendo {f.name}: {e}")
        files_sheets[f.name] = []

all_sheet_keys = []
for fname, sheets in files_sheets.items():
    for s in sheets:
        all_sheet_keys.append(f"{fname} › {s}")

selected_sheets = st.sidebar.multiselect("Elige las hojas que quieres incluir (puedes seleccionar muchas).", all_sheet_keys, default=all_sheet_keys)

if not selected_sheets:
    st.sidebar.warning("Selecciona al menos una hoja para incluir en el análisis.")
    st.stop()

# ---------- Cargar DataFrame combinado (solo las hojas seleccionadas) ----------
@st.cache_data(show_spinner=False)
def load_selected_sheets(uploaded_files, selected_sheet_keys):
    rows = []
    for f in uploaded_files:
        fname = f.name
        try:
            xls = pd.ExcelFile(f)
        except Exception:
            continue
        for s in xls.sheet_names:
            key = f"{fname} › {s}"
            if key not in selected_sheet_keys:
                continue
            try:
                tmp = pd.read_excel(xls, sheet_name=s)
                tmp['_source_file'] = fname
                tmp['_source_sheet'] = s
                rows.append(tmp)
            except Exception:
                continue
    if rows:
        return pd.concat(rows, ignore_index=True)
    else:
        return pd.DataFrame()

df = load_selected_sheets(uploaded, selected_sheets)

if df.empty:
    st.error("No se cargaron datos desde las hojas seleccionadas. Revisa que las hojas contengan tablas.")
    st.stop()

st.success(f"Datos cargados: {len(df)} filas (desde {len(selected_sheets)} hojas).")

# ---------- Normalizar columnas clave a string y detectar cuáles existen ----------
expected_min = {"ASIGNATURA", "PREGUNTA", "RESPUESTA"}
optional_cols = ["PERIODOESCOLAR", "ENCUESTA_ID", "DEPARTAMENTO", "PROGRAMAEDUCATIVO", "NIVELACADEMICO", "MATERIA_ID"]
for col in list(expected_min | set(optional_cols) | {'_source_file', '_source_sheet'}):
    if col in df.columns:
        df[col] = df[col].fillna("Desconocido").astype(str)

missing_min = expected_min - set(df.columns)
if missing_min:
    st.error(f"Las siguientes columnas requeridas NO están en los datos: {', '.join(missing_min)}. El dataset mínimo debe contener ASIGNATURA, PREGUNTA y RESPUESTA.")
    st.stop()

# ---------- Sidebar: modo de análisis y filtros dinámicos ----------
st.sidebar.header("3) Parámetros de análisis")
ngram_n = st.sidebar.select_slider("Selecciona n (n-grama)", options=[1,2,3], value=2)
scope_mode = st.sidebar.radio("Modo de análisis", options=["Agregado (todas las filas seleccionadas)", "Comparar por departamento/asignatura/sheet"])

# Dynamic filters: show only if column present
filters = {}
if 'PERIODOESCOLAR' in df.columns:
    periodos = sorted(df['PERIODOESCOLAR'].unique())
    filters['PERIODOESCOLAR'] = st.sidebar.multiselect("Periodo(es) escolares", periodos, default=periodos)
if 'ENCUESTA_ID' in df.columns:
    encuestas = sorted(df['ENCUESTA_ID'].unique())
    filters['ENCUESTA_ID'] = st.sidebar.multiselect("Encuesta(s)", encuestas, default=encuestas)
if 'PREGUNTA' in df.columns:
    preguntas = sorted(df['PREGUNTA'].unique())
    filters['PREGUNTA'] = st.sidebar.multiselect("Pregunta(s)", preguntas, default=preguntas)
if 'DEPARTAMENTO' in df.columns:
    deptos = sorted(df['DEPARTAMENTO'].unique())
    filters['DEPARTAMENTO'] = st.sidebar.multiselect("Departamento(s)", deptos, default=deptos[:3] if deptos else [])
if 'ASIGNATURA' in df.columns:
    asigns = sorted(df['ASIGNATURA'].unique())
    filters['ASIGNATURA'] = st.sidebar.multiselect("Asignatura(s)", asigns, default=asigns[:3] if asigns else [])
if '_source_sheet' in df.columns:
    sheets = sorted(df['_source_sheet'].unique())
    filters['_source_sheet'] = st.sidebar.multiselect("Hoja(s) fuente", sheets, default=sheets)

# Apply filters to df_filtered
df_filtered = df.copy()
for col, sel in filters.items():
    if sel:
        df_filtered = df_filtered[df_filtered[col].isin(sel)]

st.markdown(f"### ✅ Datos filtrados: {len(df_filtered)} respuestas")
st.write(df_filtered.head(5))

# ---------- Preparar texto limpio columna ----------
if 'RESPUESTA_LIMPIA' not in df_filtered.columns:
    df_filtered['RESPUESTA_LIMPIA'] = df_filtered['RESPUESTA'].apply(texto_limpio_str)

# ---------- Análisis de n-gramas ----------
st.header("Análisis de n-gramas y visualizaciones")

# Option to aggregate by a grouping column or overall
group_by = None
if scope_mode.startswith("Comparar"):
    compare_options = []
    if 'DEPARTAMENTO' in df_filtered.columns: compare_options.append('DEPARTAMENTO')
    if 'ASIGNATURA' in df_filtered.columns: compare_options.append('ASIGNATURA')
    if '_source_sheet' in df_filtered.columns: compare_options.append('_source_sheet')
    if compare_options:
        group_by = st.selectbox("Comparar por:", ["Sin agrupación"] + compare_options)
    else:
        st.info("No hay columnas para comparar; se mostrará el agregado.")

def build_ngrams_counter(series_texts, n):
    c = Counter()
    for text in series_texts:
        toks = limpiar_y_tokenizar(text)
        if len(toks) == 0:
            continue
        for ng in ngrams(toks, n):
            c[ng] += 1
    return c

top_k = st.sidebar.number_input("Top K n-gramas a mostrar", min_value=5, max_value=100, value=15, step=5)

# ---------- CORRECCIÓN: calcular contador global SIEMPRE ----------
c_all = build_ngrams_counter(df_filtered['RESPUESTA_LIMPIA'], ngram_n)
top_all = c_all.most_common(top_k)

if group_by and group_by != "Sin agrupación":
    groups = df_filtered[group_by].unique()
    st.subheader(f"Top {ngram_n}-gramas por `{group_by}`")
    combined = {}
    for g in groups:
        texts = df_filtered[df_filtered[group_by] == g]['RESPUESTA_LIMPIA']
        cnt = build_ngrams_counter(texts, ngram_n)
        top = cnt.most_common(top_k)
        combined[g] = top
        if top:
            words = [" ".join(k) for k,v in top]
            freqs = [v for k,v in top]
            fig = px.bar(x=freqs, y=words, orientation='h', title=str(g))
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info(f"No hay n-gramas para {g}")
else:
    if top_all:
        ngram_df = pd.DataFrame({
            "n-grama": [" ".join(x[0]) for x in top_all],
            "frecuencia": [x[1] for x in top_all]
        })
        st.subheader(f"Top {ngram_n}-gramas (agregado)")
        fig = px.bar(ngram_df, x="frecuencia", y="n-grama", orientation="h", title=f"Top {ngram_n}-gramas", color="frecuencia", color_continuous_scale="blues")
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("No se encontraron n-gramas con el texto filtrado.")

# ---------- Wordcloud (from aggregated n-grams or full text) ----------
st.subheader("Nube de palabras")
wc_source = st.radio("Generar nube desde:", options=["Texto completo (tokens)", f"Top {top_k} n-gramas"], index=0)

if wc_source.startswith("Texto"):
    freq_tokens = Counter()
    for tok in df_filtered['RESPUESTA_LIMPIA'].str.split().explode().dropna():
        freq_tokens[tok] += 1
else:
    # top_all ya existe (posiblemente vacío)
    freq_tokens = Counter({" ".join(k): v for k,v in top_all})

if freq_tokens:
    wc = WordCloud(width=1000, height=400, background_color='white').generate_from_frequencies(freq_tokens)
    fig_wc, ax_wc = plt.subplots(figsize=(12,4))
    ax_wc.imshow(wc, interpolation='bilinear')
    ax_wc.axis("off")
    st.pyplot(fig_wc)
else:
    st.info("Nada para mostrar en la nube de palabras.")

# ---------- Comparativa: Conteo de respuestas por dimensión ----------
st.subheader("Comparativa - cantidad de respuestas por dimensión")
compare_dim = st.selectbox("Mostrar conteo por:", options=[x for x in ['DEPARTAMENTO','ASIGNATURA','_source_sheet'] if x in df_filtered.columns] + ["Ninguno"])
if compare_dim != "Ninguno":
    counts = df_filtered[compare_dim].value_counts().reset_index()
    counts.columns = [compare_dim, "CANTIDAD"]
    fig_counts = px.bar(counts, x=compare_dim, y="CANTIDAD", color="CANTIDAD", text="CANTIDAD")
    st.plotly_chart(fig_counts, use_container_width=True)

# ---------- Explorar respuestas que contienen uno o varios n-gramas ----------
st.subheader("Explorar respuestas por n-grama")
available_ngrams = [" ".join(k) for k,v in top_all] if top_all else []
chosen_ngrams = st.multiselect("Selecciona n-gramas para filtrar respuestas (puedes seleccionar varios):", available_ngrams)

if chosen_ngrams:
    mask = df_filtered['RESPUESTA_LIMPIA'].apply(lambda t: any(ng in t for ng in chosen_ngrams))
    matched = df_filtered[mask]
    st.markdown(f"Se encontraron **{len(matched)}** respuestas que contienen los n-gramas seleccionados.")
    show_cols = [c for c in ['_source_file','_source_sheet','PERIODOESCOLAR','ENCUESTA_ID','PREGUNTA','DEPARTAMENTO','ASIGNATURA','PROGRAMAEDUCATIVO','RESPUESTA'] if c in matched.columns]
    st.dataframe(matched[show_cols], use_container_width=True)
    todownload = matched[show_cols].to_csv(index=False).encode('utf-8')
    st.download_button("📥 Descargar respuestas filtradas (CSV)", data=todownload, file_name="respuestas_filtradas.csv", mime="text/csv")
else:
    st.info("Selecciona al menos un n-grama para ver respuestas que lo contengan.")

# ---------- Footer / tips ----------
st.markdown("---")
st.caption("Consejo: para comparar periodos o encuestas, sube múltiples archivos (o un Excel con varias hojas) y selecciona las hojas correspondientes. Si tu archivo no tiene alguna columna (ej. DEPARTAMENTO), la app ocultará ese filtro automáticamente.")
