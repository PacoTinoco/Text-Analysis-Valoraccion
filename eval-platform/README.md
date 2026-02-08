# EvalPlatform

Plataforma de análisis automatizado de evaluaciones docentes.

## Arquitectura

```
apps/
├── web/     → Next.js 14 (Frontend)    → Vercel
├── api/     → FastAPI (Backend Python)  → Railway/Render
packages/
└── shared/  → Tipos compartidos
```

## Requisitos previos

- **Node.js** >= 18
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Python** >= 3.11
- Cuenta en **Supabase** (gratis): https://supabase.com

---

## Setup paso a paso

### 1. Clonar y entrar al repo

```bash
git clone https://github.com/TU-USUARIO/eval-platform.git
cd eval-platform
```

### 2. Instalar dependencias del frontend

```bash
pnpm install
```

### 3. Configurar variables de entorno del frontend

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edita `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Setup del backend (Python)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate        # Mac/Linux
# .venv\Scripts\activate         # Windows

pip install -r requirements.txt
cp .env.example .env
```

Edita `apps/api/.env` con tus credenciales de Supabase.

### 5. Correr todo

**Terminal 1 — Frontend:**
```bash
# Desde la raíz del proyecto
pnpm dev:web
```
→ Abre http://localhost:3000

**Terminal 2 — Backend:**
```bash
# Desde la raíz del proyecto
pnpm dev:api
```
→ API en http://localhost:8000
→ Docs en http://localhost:8000/api/v1/docs

### 6. Verificar conexión

Abre http://localhost:3000 y verifica que el dashboard muestre:
- **Estado del API:** Conectado ✓
- **Versión:** 0.1.0

---

## Roadmap de módulos

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Fundación (monorepo + API + UI base) | ✅ |
| 2 | Upload & Parsing | 🔲 |
| 3 | Filtros Dinámicos | 🔲 |
| 4 | Motor de Análisis (NLP) | 🔲 |
| 5 | IA con Claude API | 🔲 |
| 6 | Dashboard & Reportes | 🔲 |
| 7 | Auth & Multi-usuario | 🔲 |
| 8 | Deploy & Escalamiento | 🔲 |

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | FastAPI (Python) |
| Base de datos | Supabase (PostgreSQL) |
| Almacenamiento | Supabase Storage |
| NLP | spaCy + Claude API |
| Deploy | Vercel + Railway |
