# 📊 EvalPlatform — Análisis de Evaluaciones Docentes

Plataforma web para el análisis automatizado de evaluaciones docentes universitarias. Permite procesar archivos con miles de respuestas, generar análisis de sentimiento, extraer patrones lingüísticos y producir reportes interactivos — todo desde una interfaz moderna y accesible.

---

## 🎯 Objetivo

Las universidades recopilan miles de evaluaciones docentes cada semestre, pero analizarlas manualmente es un proceso lento, subjetivo y difícil de escalar. **EvalPlatform** automatiza este análisis para que los responsables académicos puedan:

- **Identificar fortalezas y áreas de mejora** de cada departamento y profesor
- **Detectar patrones recurrentes** en las opiniones de los estudiantes
- **Comparar departamentos** con métricas objetivas de sentimiento
- **Generar reportes exportables** para la toma de decisiones
- **Reducir el tiempo de análisis** de semanas a minutos

---

## ✨ Características

### Análisis de Texto (NLP)
- **Análisis de sentimiento** automático en español (positivo, neutro, negativo)
- **Extracción de palabras clave**, bigramas y trigramas más frecuentes
- **Detección de nombres** de profesores mencionados en las respuestas
- **Identificación de sugerencias** y propuestas de mejora
- **Drill-down interactivo** — clic en cualquier palabra o frase para ver todas las respuestas relacionadas

### Visualizaciones
- Gráficas de sentimiento (pie charts, bar charts)
- Comparativa de departamentos con rankings
- Nube de palabras interactiva
- Distribución de volumen de respuestas por departamento

### Gestión de Reportes
- **Guardar reportes** en la nube (Supabase) para consulta posterior
- **Exportar a HTML** interactivo con gráficas Chart.js
- Historial de análisis por usuario

### Resumen con IA (solo admin)
- Generación de reportes ejecutivos con Ollama (local) o Anthropic Claude
- Resúmenes por departamento con hallazgos y recomendaciones concretas

### Autenticación y Roles
- Login con correo institucional (@iteso.mx)
- Roles: **admin** (acceso completo + IA) y **usuario** (análisis y reportes)
- Cada usuario solo ve sus propios archivos y reportes

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|---|---|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS, Recharts |
| **Backend** | FastAPI (Python), Pandas, NLP con análisis de sentimiento |
| **Base de datos** | Supabase (PostgreSQL + Auth + Storage) |
| **IA** | Ollama (local, LLaMA 3.1) / Anthropic Claude (API) |
| **Deploy** | Vercel (frontend) + Render (backend) |

---

## 📁 Estructura del Proyecto

```
eval-platform/
├── apps/
│   ├── web/                          # Frontend (Next.js)
│   │   ├── app/
│   │   │   ├── layout.tsx            # Layout principal
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── login/page.tsx        # Página de login
│   │   │   ├── upload/page.tsx       # Subida y análisis
│   │   │   └── reports/page.tsx      # Historial de reportes
│   │   ├── components/
│   │   │   ├── auth/auth-guard.tsx   # Protección de rutas
│   │   │   ├── layout/
│   │   │   │   ├── sidebar.tsx       # Navegación lateral
│   │   │   │   └── app-shell.tsx     # Shell con auth condicional
│   │   │   ├── upload/
│   │   │   │   ├── file-dropzone.tsx # Drag & drop de archivos
│   │   │   │   └── column-preview.tsx# Configuración de columnas
│   │   │   └── ui/
│   │   │       └── expandable-response.tsx
│   │   └── lib/
│   │       ├── api.ts                # URL base del API
│   │       ├── supabase.ts           # Cliente Supabase
│   │       ├── save-report.ts        # Guardar reportes
│   │       └── export-report.ts      # Exportar HTML
│   │
│   └── api/                          # Backend (FastAPI)
│       ├── app/
│       │   ├── main.py               # Entrada de la API
│       │   ├── routers/
│       │   │   ├── upload.py         # Endpoint de subida
│       │   │   └── analyze.py        # Endpoints de análisis + IA
│       │   └── services/
│       │       ├── text_analyzer.py  # Motor NLP
│       │       └── ai_analyzer.py    # Integración con Ollama/Claude
│       └── requirements.txt
│
└── packages/                         # Configuraciones compartidas
```

---

## 🚀 Instalación y Desarrollo Local

### Prerrequisitos

- Node.js 18+
- Python 3.10+
- pnpm (`npm install -g pnpm`)

### 1. Clonar el repositorio

```bash
git clone https://github.com/PacoTinoco/Text-Analysis-Valoraccion.git
cd Text-Analysis-Valoraccion/eval-platform
```

### 2. Instalar dependencias del frontend

```bash
cd apps/web
pnpm install
```

### 3. Configurar el backend

```bash
cd apps/api
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 4. Variables de entorno

Crea `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 5. Levantar los servidores

**Terminal 1 — Frontend:**

```bash
cd apps/web
pnpm dev
```

**Terminal 2 — Backend:**

```bash
cd apps/api
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000 --timeout-keep-alive 300
```

Abre `http://localhost:3000`

---

## 🌐 Deploy en Producción

| Servicio | Plataforma | Configuración |
|---|---|---|
| Frontend | **Vercel** | Root: `eval-platform/apps/web`, Framework: Next.js |
| Backend | **Render** | Root: `eval-platform/apps/api`, Runtime: Python |
| Base de datos | **Supabase** | PostgreSQL + Auth + Storage |

### Variables de entorno en Vercel

```
NEXT_PUBLIC_API_URL=https://tu-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

---

## 🤖 Resumen con IA (Opcional)

### Opción 1 — Ollama (local, gratis)

```bash
# Instalar desde ollama.com
ollama pull llama3.1:8b
```

### Opción 2 — Anthropic Claude (API)

```bash
# Variable de entorno en el backend
ANTHROPIC_API_KEY=tu-api-key
```

> La funcionalidad de IA solo está disponible para usuarios con rol **admin**.

---

## 📊 Flujo de Uso

1. **Registrarse** con correo institucional
2. **Subir archivo** XLSX o CSV con evaluaciones
3. **Configurar** columna de respuesta, filtros y agrupación
4. **Analizar** — el motor NLP procesa sentimiento, n-gramas y nombres
5. **Explorar** resultados por pestañas: General, Departamentos, Comparativa
6. **Guardar** el reporte para consulta posterior
7. **Exportar** a HTML interactivo si es necesario

---

## 📄 API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/upload` | Subir archivo XLSX/CSV |
| `POST` | `/api/v1/analyze` | Ejecutar análisis NLP |
| `POST` | `/api/v1/drilldown` | Buscar respuestas por frase |
| `POST` | `/api/v1/ai-summary` | Generar resumen con IA |

---

## 🔮 Roadmap

- [ ] Análisis de preguntas cuantitativas (escalas 1-5)
- [ ] Selector flexible de columnas (el usuario elige qué analizar)
- [ ] Selección múltiple de preguntas en un solo reporte
- [ ] Conexión directa a base de datos de evaluaciones
- [ ] Dashboard con métricas históricas
- [ ] Exportación a PDF
- [ ] Docker + AWS para mayor escala

---

## 👥 Autor

**Francisco Tinoco** — [@PacoTinoco](https://github.com/PacoTinoco)

Desarrollado para el ITESO — Universidad Jesuita de Guadalajara.

---

## 📝 Licencia

Este proyecto es de uso interno para la universidad. Todos los derechos reservados.