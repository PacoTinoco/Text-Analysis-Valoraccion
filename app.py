import streamlit as st
import pandas as pd
import plotly.express as px
from collections import Counter
from wordcloud import WordCloud
import matplotlib.pyplot as plt
import nltk
from nltk.util import ngrams
from nltk.corpus import stopwords
import re

# ==============================
# CONFIGURACIÓN GENERAL
# ==============================
st.set_page_config(
    page_title="Análisis de Texto - Valoracción",
    layout="wide",
    page_icon="🧠"
)

st.title("🧠 Análisis de Texto de Evaluaciones")
st.markdown("Sube un archivo Excel con las respuestas abiertas y analiza patrones por **departamento**, **asignatura** o **programa educativo**.")

# ==============================
# CARGA DE DATOS
# ==============================
uploaded_file = st.file_uploader("📂 Sube tu archivo Excel", type=["xlsx"])

if uploaded_file:
    # Leer todas las hojas y concatenarlas si es necesario
    xls = pd.ExcelFile(uploaded_file)
    df_list = [pd.read_excel(xls, sheet_name=sheet) for sheet in xls.sheet_names]
    df = pd.concat(df_list, ignore_index=True)

    # ==============================
    # LIMPIEZA DE COLUMNAS RELEVANTES
    # ==============================
    columnas_importantes = [
        'ASIGNATURA', 'DEPARTAMENTO', 'ENCUESTA_ID', 'NIVELACADEMICO',
        'PERIODOESCOLAR', 'PREGUNTA', 'PROGRAMAEDUCATIVO', 'RESPUESTA'
    ]
    df = df[[c for c in columnas_importantes if c in df.columns]].copy()

    # Convertir todo a string y limpiar nulos
    for col in ['PERIODOESCOLAR', 'ENCUESTA_ID', 'PREGUNTA', 'RESPUESTA', 'DEPARTAMENTO', 'ASIGNATURA', 'PROGRAMAEDUCATIVO']:
        df[col] = df[col].astype(str).fillna("Desconocido")

    # ==============================
    # SIDEBAR DE FILTROS
    # ==============================
    st.sidebar.header("🎓 Filtros de análisis")

    periodo = st.sidebar.selectbox(
        "📅 Selecciona el periodo escolar",
        sorted(df['PERIODOESCOLAR'].unique())
    )

    encuestas_disponibles = sorted(df[df['PERIODOESCOLAR'] == periodo]['ENCUESTA_ID'].unique())
    encuesta = st.sidebar.selectbox("🧾 Selecciona la encuesta", encuestas_disponibles)

    preguntas_disponibles = sorted(df[(df['PERIODOESCOLAR'] == periodo) & (df['ENCUESTA_ID'] == encuesta)]['PREGUNTA'].unique())
    pregunta = st.sidebar.selectbox("❓ Selecciona la pregunta abierta", preguntas_disponibles)

    departamentos_disponibles = sorted(df[(df['PERIODOESCOLAR'] == periodo)]['DEPARTAMENTO'].unique())
    departamentos_seleccionados = st.sidebar.multiselect(
        "🏛️ Selecciona los departamentos a analizar",
        departamentos_disponibles,
        default=departamentos_disponibles[:3]
    )

    ngram_n = st.sidebar.select_slider("📏 Tipo de n-grama", options=[1, 2, 3], value=2)

    # ==============================
    # FILTRAR DATOS
    # ==============================
    df_filtered = df[
        (df['PERIODOESCOLAR'] == periodo) &
        (df['ENCUESTA_ID'] == encuesta) &
        (df['PREGUNTA'] == pregunta) &
        (df['DEPARTAMENTO'].isin(departamentos_seleccionados))
    ].copy()

    st.markdown(f"### 📊 {len(df_filtered)} respuestas encontradas para la pregunta seleccionada")
    st.write(df_filtered[['ASIGNATURA', 'DEPARTAMENTO', 'RESPUESTA']].head())

    # ==============================
    # FUNCIONES DE PROCESAMIENTO
    # ==============================
    nltk.download('stopwords', quiet=True)
    stop_words = set(stopwords.words('spanish'))

    def limpiar_texto(texto):
        texto = str(texto).lower()
        texto = re.sub(r"[^a-záéíóúüñ\s]", "", texto)
        tokens = [t for t in texto.split() if t not in stop_words and len(t) > 2]
        return tokens

    def obtener_ngrams(texto, n=2):
        tokens = limpiar_texto(texto)
        return list(ngrams(tokens, n))

    # ==============================
    # ANÁLISIS DE N-GRAMAS
    # ==============================
    todos_ngrams = []
    for resp in df_filtered['RESPUESTA']:
        todos_ngrams.extend(obtener_ngrams(resp, n=ngram_n))

    conteo = Counter(todos_ngrams)
    top_ngrams = conteo.most_common(15)

    if top_ngrams:
        st.markdown(f"### 🔍 Top {ngram_n}-gramas más frecuentes")
        ngram_df = pd.DataFrame({
            "n-grama": [" ".join(x[0]) for x in top_ngrams],
            "frecuencia": [x[1] for x in top_ngrams]
        })

        fig = px.bar(
            ngram_df,
            x="frecuencia",
            y="n-grama",
            orientation="h",
            title=f"Top {ngram_n}-gramas más frecuentes",
            color="frecuencia",
            color_continuous_scale="purples"
        )
        st.plotly_chart(fig, use_container_width=True)

        # WordCloud
        st.markdown("### ☁️ Nube de palabras")
        wc = WordCloud(width=1000, height=400, background_color="white", colormap="Purples").generate(" ".join([" ".join(x[0]) for x in top_ngrams]))
        fig_wc, ax_wc = plt.subplots(figsize=(10, 4))
        ax_wc.imshow(wc, interpolation='bilinear')
        ax_wc.axis("off")
        st.pyplot(fig_wc)

        # Selección de n-gramas para ver respuestas completas
        seleccion = st.multiselect("🗒️ Selecciona n-gramas para ver respuestas completas", ngram_df["n-grama"].tolist())

        if seleccion:
            st.markdown("### 🧾 Respuestas relacionadas")
            for sel in seleccion:
                subset = df_filtered[df_filtered['RESPUESTA'].str.contains(sel, case=False, na=False)]
                if not subset.empty:
                    st.markdown(f"#### 📌 Respuestas con '{sel}':")
                    st.dataframe(subset[['ASIGNATURA', 'DEPARTAMENTO', 'RESPUESTA']])
                else:
                    st.info(f"No se encontraron respuestas con '{sel}'.")

    else:
        st.warning("No se encontraron respuestas válidas o texto suficiente para generar n-gramas.")

    # ==============================
    # COMPARATIVA ENTRE DEPARTAMENTOS
    # ==============================
    st.markdown("### 🏛️ Comparativa entre departamentos")

    dept_count = df_filtered['DEPARTAMENTO'].value_counts().reset_index()
    dept_count.columns = ['DEPARTAMENTO', 'CANTIDAD_RESPUESTAS']

    fig_dept = px.bar(
        dept_count,
        x='DEPARTAMENTO',
        y='CANTIDAD_RESPUESTAS',
        title='Cantidad de respuestas por departamento',
        color='CANTIDAD_RESPUESTAS',
        color_continuous_scale='Blues'
    )
    st.plotly_chart(fig_dept, use_container_width=True)

else:
    st.info("📤 Esperando a que subas un archivo Excel con las columnas requeridas.")

