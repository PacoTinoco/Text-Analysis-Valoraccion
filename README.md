# <img src="https://upload.wikimedia.org/wikipedia/commons/3/3e/Logo_ITESO.svg" alt="ITESO" width="70"/>  ValorAcción ITESO - Análisis de Evaluaciones

### 🧠 Plataforma de Análisis Automático de Evaluaciones de Asignaturas  
**Desarrollado para:** Coordinaciones Académicas del ITESO  
**Autor:** Francisco Tinoco (Ingeniería en Ciencia de Datos)  

---

## 📘 Descripción General

**ValorAcción ITESO** es una aplicación web interactiva desarrollada en **Python + Streamlit** que permite a las coordinaciones académicas del ITESO analizar de forma automática los resultados de evaluaciones docentes o institucionales.

La herramienta ofrece la posibilidad de **subir archivos Excel** con las respuestas de los alumnos, procesar el texto automáticamente y generar **visualizaciones e insights inmediatos** mediante técnicas de procesamiento de lenguaje natural (NLP).

---

## 🚀 Funcionalidades Principales

✅ **Carga de archivos Excel (.xlsx)** con múltiples hojas o periodos.  
✅ **Selección múltiple de asignaturas y periodos** para comparación simultánea.  
✅ **Generación automática de n-gramas (1, 2, 3...)** con análisis de frecuencia.  
✅ **Nube de palabras** generada a partir de las respuestas abiertas.  
✅ **Filtro por pregunta** para visualizar las respuestas específicas.  
✅ **Diseño responsivo y amigable con Streamlit.**  
✅ **Escalable** para manejar archivos grandes y múltiples usuarios.  

---

## 🖥️ Interfaz

| Subida del archivo | Filtros de análisis | Resultados visuales |
|:-------------------:|:-------------------:|:-------------------:|
| <img src="https://github.com/valoraccion-iteso/text-analysis-app/assets/upload_excel.png" width="270"/> | <img src="https://github.com/valoraccion-iteso/text-analysis-app/assets/filters.png" width="270"/> | <img src="https://github.com/valoraccion-iteso/text-analysis-app/assets/wordcloud.png" width="270"/> |

> *Las imágenes son representativas. Se pueden sustituir por capturas reales de la app una vez desplegada.*

---

## 📂 Estructura del Repositorio

Text-Analysis-Valoraccion/
│
├── app.py # Código principal de la aplicación Streamlit
├── requirements.txt # Dependencias del proyecto
└── README.md # Documentación del proyecto