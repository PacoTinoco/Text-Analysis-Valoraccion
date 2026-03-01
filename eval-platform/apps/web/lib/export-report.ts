/**
 * export-report.ts
 * Genera reportes HTML autocontenidos con diseño premium.
 *
 * Soporta dos formatos:
 *  - Legacy single-question:  downloadHtmlReport()    (backward compat)
 *  - Multi-question Phase 2:  downloadMultiHtmlReport()
 */

// ── Types ──────────────────────────────────────────────────────────────────

type GroupData = {
  summary: { total_responses: number; valid_responses: number; short_responses: number; avg_length: number };
  sentiment: { positivo: number; negativo: number; neutro: number };
  top_words: { word: string; count: number }[];
  top_phrases: { phrase: string; count: number }[];
  top_trigrams: { phrase: string; count: number }[];
  top_names: { name: string; count: number }[];
  suggestions: string[];
  highlights: { positive: string[]; negative: string[] };
};

type DistItem = { count: number; pct: number };
type QuantResult = {
  summary: { total: number; valid: number; invalid: number; mean: number; median: number; std_dev: number; min: number; max: number };
  distribution: Record<string, DistItem>;
  by_group?: Record<string, { summary: { mean: number; total: number }; distribution: Record<string, DistItem> }>;
};

type QuestionResult = {
  question_number: string;
  analysis_type: "quantitative" | "qualitative";
  total_responses: number;
  quantitative: QuantResult | null;
  qualitative: GroupData | null;
  by_group: Record<string, any> | null;
};

type ExportData = {
  general: GroupData;
  by_group: Record<string, GroupData> | null;
  config: { file: string; response_column: string; total_rows_after_filter: number };
  aiSummary?: string;
};

type MultiExportData = {
  questions: QuestionResult[];
  config: {
    file: string;
    pregunta_column: string;
    respuesta_column: string;
    group_by: string | null;
    total_rows: number;
  };
  aiSummary?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="font-family:\'Playfair Display\',serif;font-size:1.1rem;font-weight:700;margin:20px 0 8px;color:#1a1a2e">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:\'Playfair Display\',serif;font-size:1.4rem;font-weight:700;margin:28px 0 10px;color:#1a1a2e">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-family:\'Playfair Display\',serif;font-size:1.8rem;font-weight:800;margin:0 0 16px;color:#1a1a2e">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:12px 0">$&</ul>')
    .replace(/\n\n/g, '</p><p style="margin:10px 0">')
    .replace(/\n/g, "<br>");
}

function getMeanColorHex(mean: number): string {
  if (mean >= 4.5) return "#2a7a6e";   // teal
  if (mean >= 3.5) return "#2563eb";   // blue
  if (mean >= 2.5) return "#b8860b";   // gold
  return "#c45d3e";                    // accent/red
}

function getMeanBgHex(mean: number): string {
  if (mean >= 4.5) return "#ecf7f5";
  if (mean >= 3.5) return "#eff6ff";
  if (mean >= 2.5) return "#fdf6e3";
  return "#fef0eb";
}

const DIST_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981"];

// ── Shared Premium CSS ─────────────────────────────────────────────────────

const PREMIUM_CSS = `
:root {
  --ink: #1a1a2e;
  --ink-light: #3d3d5c;
  --ink-muted: #6b6b8d;
  --surface: #fafaf8;
  --surface-warm: #f5f3ef;
  --surface-card: #ffffff;
  --accent: #c45d3e;
  --accent-light: #e8785a;
  --accent-bg: #fef0eb;
  --teal: #2a7a6e;
  --teal-light: #3aa393;
  --teal-bg: #ecf7f5;
  --gold: #b8860b;
  --gold-bg: #fdf6e3;
  --border: #e5e3de;
  --shadow: 0 1px 3px rgba(26,26,46,0.06), 0 6px 20px rgba(26,26,46,0.04);
  --shadow-lg: 0 4px 12px rgba(26,26,46,0.08), 0 20px 48px rgba(26,26,46,0.06);
  --radius: 12px;
  --radius-sm: 8px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',-apple-system,sans-serif;background:var(--surface);color:var(--ink);line-height:1.65;-webkit-font-smoothing:antialiased}

/* HERO */
.hero{background:linear-gradient(135deg,#1a1a2e 0%,#2d2d4e 40%,#3a2a2a 100%);color:white;padding:60px 40px 50px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-50%;right:-20%;width:600px;height:600px;background:radial-gradient(circle,rgba(196,93,62,0.15) 0%,transparent 70%);border-radius:50%}
.hero::after{content:'';position:absolute;bottom:-30%;left:-10%;width:400px;height:400px;background:radial-gradient(circle,rgba(42,122,110,0.12) 0%,transparent 70%);border-radius:50%}
.hero-inner{max-width:1200px;margin:0 auto;position:relative;z-index:1}
.hero-badge{display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);padding:6px 16px;border-radius:100px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:20px;backdrop-filter:blur(10px)}
.hero h1{font-family:'Playfair Display',serif;font-size:clamp(2rem,4.5vw,3.2rem);font-weight:800;line-height:1.15;margin-bottom:12px}
.hero h1 em{font-style:italic;color:var(--accent-light)}
.hero-sub{font-size:1.05rem;color:rgba(255,255,255,0.65);max-width:600px;margin-bottom:30px}
.hero-stats{display:flex;gap:32px;flex-wrap:wrap}
.hero-stat-value{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:var(--accent-light)}
.hero-stat-label{font-size:0.8rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}

/* NAV */
.nav-bar{background:var(--surface-card);border-bottom:1px solid var(--border);padding:0 40px;position:sticky;top:0;z-index:100;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
.nav-inner{max-width:1200px;margin:0 auto;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.nav-inner::-webkit-scrollbar{display:none}
.nav-btn{padding:14px 18px;font-size:0.82rem;font-weight:500;color:var(--ink-muted);border:none;background:none;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all 0.2s;font-family:inherit}
.nav-btn:hover{color:var(--ink)}
.nav-btn.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}

/* LAYOUT */
.container{max-width:1200px;margin:0 auto;padding:40px}
.section{margin-bottom:56px;animation:fadeUp 0.5s ease-out}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.section-label{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--accent);margin-bottom:8px}
.section-title{font-family:'Playfair Display',serif;font-size:1.7rem;font-weight:700;margin-bottom:8px;color:var(--ink)}
.section-desc{color:var(--ink-muted);font-size:0.95rem;max-width:700px;margin-bottom:28px}

/* CARDS */
.card{background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius);padding:28px;box-shadow:var(--shadow);transition:box-shadow 0.25s}
.card:hover{box-shadow:var(--shadow-lg)}
.card-title{font-size:0.95rem;font-weight:700;margin-bottom:16px;color:var(--ink)}
.card-subtitle{font-size:0.78rem;color:var(--ink-muted);margin-top:-10px;margin-bottom:16px}

/* GRID */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}

/* KPI CARDS */
.kpi-card{background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:20px 24px;text-align:center}
.kpi-icon{width:40px;height:40px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:10px}
.kpi-value{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:700;color:var(--ink)}
.kpi-label{font-size:0.75rem;color:var(--ink-muted);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px}

/* QUANT BAR */
.dist-bar-wrap{display:flex;flex-direction:column;gap:8px}
.dist-row{display:flex;align-items:center;gap:10px}
.dist-label{width:18px;font-size:0.78rem;font-weight:700;color:var(--ink-muted);text-align:right;flex-shrink:0}
.dist-bar-bg{flex:1;height:30px;background:#f0eeea;border-radius:6px;overflow:hidden;position:relative}
.dist-bar-fill{height:100%;border-radius:6px;display:flex;align-items:center;padding:0 10px;font-size:0.75rem;font-weight:600;color:white;transition:width 0.6s ease-out;min-width:2px}
.dist-count{font-size:0.72rem;font-weight:700;color:var(--ink-muted);flex-shrink:0;min-width:60px;text-align:right}

/* TRIGRAMS */
.trigram-list{display:flex;flex-direction:column;gap:8px}
.trigram-row{display:flex;align-items:center;gap:12px}
.trigram-rank{width:22px;font-size:0.72rem;font-weight:700;color:var(--ink-muted);text-align:right;flex-shrink:0}
.trigram-bar-wrap{flex:1;position:relative;height:32px}
.trigram-bar{height:100%;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:0.78rem;font-weight:500;color:white;min-width:80px}
.trigram-bar.pos{background:linear-gradient(90deg,var(--teal),var(--teal-light))}
.trigram-bar.neg{background:linear-gradient(90deg,var(--accent),var(--accent-light))}
.trigram-bar.blue{background:linear-gradient(90deg,#2563eb,#60a5fa)}
.trigram-count{font-size:0.72rem;font-weight:700;color:var(--ink-muted);margin-left:8px;flex-shrink:0}

/* TABLE */
.dept-table{width:100%;border-collapse:collapse;font-size:0.85rem}
.dept-table thead th{text-align:left;padding:12px 16px;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--ink-muted);border-bottom:2px solid var(--border);background:var(--surface-card)}
.dept-table tbody td{padding:12px 16px;border-bottom:1px solid #f0eeea;vertical-align:middle}
.dept-table tbody tr{cursor:pointer;transition:background 0.15s}
.dept-table tbody tr:hover{background:var(--surface-warm)}
.dept-bar{height:6px;border-radius:3px;background:var(--border);min-width:100px;overflow:hidden}
.dept-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--teal),var(--teal-light))}

/* FINDING CARDS */
.finding-card{background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;border-left:4px solid var(--accent);margin-bottom:12px}
.finding-card.positive{border-left-color:var(--teal)}
.finding-card.warning{border-left-color:var(--gold)}
.finding-card h4{font-size:0.92rem;font-weight:700;margin-bottom:6px}
.finding-card p{font-size:0.85rem;color:var(--ink-light);line-height:1.6}
.finding-tag{display:inline-block;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 8px;border-radius:4px;margin-bottom:8px}
.finding-tag.pos{background:var(--teal-bg);color:var(--teal)}
.finding-tag.neg{background:var(--accent-bg);color:var(--accent)}
.finding-tag.warn{background:var(--gold-bg);color:var(--gold)}

/* DEPT DETAIL */
.dept-detail{display:none}
.dept-detail.active{display:block}
.back-btn{display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;font-weight:600;color:var(--accent);cursor:pointer;border:none;background:none;font-family:inherit;padding:6px 0;margin-bottom:20px}
.back-btn:hover{text-decoration:underline}

/* QUANT SECTION */
.quant-stats{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.quant-stat{background:var(--surface-warm);border-radius:var(--radius-sm);padding:14px 18px;text-align:center;flex:1;min-width:100px}
.quant-stat-value{font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700}
.quant-stat-label{font-size:0.72rem;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}

/* WORDS */
.word-cloud{display:flex;flex-wrap:wrap;gap:8px}
.word-tag{padding:6px 14px;border-radius:100px;font-size:0.8rem;font-weight:600;border:1.5px solid var(--border);background:var(--surface-warm);color:var(--ink-light);transition:all 0.15s}
.word-tag:hover{background:var(--teal-bg);border-color:var(--teal);color:var(--teal)}

/* AI SUMMARY */
.ai-prose{font-size:0.95rem;line-height:1.75;color:var(--ink-light)}

@media(max-width:768px){
  .grid-4{grid-template-columns:1fr 1fr}
  .grid-3,.grid-2{grid-template-columns:1fr}
  .hero{padding:40px 20px 36px}
  .container{padding:24px 16px}
  .nav-bar{padding:0 16px}
}
`;

// ── Utility builders ───────────────────────────────────────────────────────

function buildDistBars(dist: Record<string, DistItem>): string {
  return `<div class="dist-bar-wrap">` +
    [1, 2, 3, 4, 5].map((v) => {
      const item = dist[String(v)] || { count: 0, pct: 0 };
      const color = DIST_COLORS[v - 1];
      return `<div class="dist-row">
        <span class="dist-label">${v}</span>
        <div class="dist-bar-bg">
          <div class="dist-bar-fill" style="width:${item.pct.toFixed(1)}%;background:${color}">${item.pct >= 8 ? item.pct.toFixed(0) + "%" : ""}</div>
        </div>
        <span class="dist-count">${item.count.toLocaleString("es-MX")} (${item.pct.toFixed(1)}%)</span>
      </div>`;
    }).join("") +
    `</div>`;
}

function buildTrigramList(items: { phrase: string; count: number }[], maxCount: number, colorClass: string): string {
  const top = items.slice(0, 10);
  if (!top.length) return `<p style="color:var(--ink-muted);font-size:0.85rem">Sin datos suficientes</p>`;
  return `<div class="trigram-list">` + top.map((item, i) => {
    const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
    return `<div class="trigram-row">
      <span class="trigram-rank">${i + 1}</span>
      <div class="trigram-bar-wrap">
        <div class="trigram-bar ${colorClass}" style="width:${Math.max(pct, 12)}%">${escapeHtml(item.phrase)}</div>
      </div>
      <span class="trigram-count">${item.count}×</span>
    </div>`;
  }).join("") + `</div>`;
}

function buildWordCloud(words: { word: string; count: number }[]): string {
  const top = words.slice(0, 20);
  if (!top.length) return "";
  const max = top[0].count;
  return `<div class="word-cloud">` + top.map((w) => {
    const size = 0.75 + (w.count / max) * 0.5;
    return `<span class="word-tag" style="font-size:${size.toFixed(2)}rem">${escapeHtml(w.word)} <span style="opacity:0.5;font-size:0.7em">${w.count}</span></span>`;
  }).join("") + `</div>`;
}

function buildSentimentBar(s: { positivo: number; negativo: number; neutro: number }): string {
  const total = s.positivo + s.negativo + s.neutro || 1;
  const pos = (s.positivo / total * 100).toFixed(1);
  const neg = (s.negativo / total * 100).toFixed(1);
  const neu = (s.neutro / total * 100).toFixed(1);
  return `<div style="margin-bottom:16px">
    <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin-bottom:8px">
      <div style="width:${pos}%;background:#2a7a6e" title="Positivo ${pos}%"></div>
      <div style="width:${neu}%;background:#94a3b8" title="Neutro ${neu}%"></div>
      <div style="width:${neg}%;background:#c45d3e" title="Negativo ${neg}%"></div>
    </div>
    <div style="display:flex;gap:16px;font-size:0.78rem">
      <span style="color:#2a7a6e;font-weight:700">✓ Positivo ${pos}%</span>
      <span style="color:#94a3b8;font-weight:700">– Neutro ${neu}%</span>
      <span style="color:#c45d3e;font-weight:700">✗ Negativo ${neg}%</span>
    </div>
  </div>`;
}

function buildFindings(highlights: { positive: string[]; negative: string[] }, suggestions: string[]): string {
  let html = "";
  highlights.positive.slice(0, 3).forEach((h) => {
    html += `<div class="finding-card positive">
      <span class="finding-tag pos">Fortaleza</span>
      <p>${escapeHtml(h)}</p>
    </div>`;
  });
  highlights.negative.slice(0, 3).forEach((h) => {
    html += `<div class="finding-card">
      <span class="finding-tag neg">Área de oportunidad</span>
      <p>${escapeHtml(h)}</p>
    </div>`;
  });
  suggestions.slice(0, 4).forEach((s) => {
    html += `<div class="finding-card warning">
      <span class="finding-tag warn">Recomendación</span>
      <p>${escapeHtml(s)}</p>
    </div>`;
  });
  return html;
}

// ── Qualitative Section Builder ────────────────────────────────────────────

function buildQualSection(q: QuestionResult, idx: number): string {
  const qual = q.qualitative!;
  const maxTrigram = qual.top_trigrams[0]?.count || 1;
  const maxWord = qual.top_words[0]?.count || 1;
  const sectionNum = String(idx + 1).padStart(2, "0");

  return `<div id="qual-${q.question_number}" class="section">
    <div class="section-label">${sectionNum} — Pregunta ${q.question_number} · Cualitativa</div>
    <div class="section-title">Análisis Textual</div>
    <p class="section-desc">${q.total_responses.toLocaleString("es-MX")} respuestas analizadas.</p>

    <div class="grid-2" style="margin-bottom:28px">
      <!-- Sentiment -->
      <div class="card">
        <div class="card-title">Sentimiento General</div>
        ${buildSentimentBar(qual.sentiment)}
        <div class="grid-3" style="gap:10px;margin-top:8px">
          <div style="text-align:center;padding:12px;background:var(--teal-bg);border-radius:8px">
            <div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:var(--teal)">${qual.sentiment.positivo.toLocaleString("es-MX")}</div>
            <div style="font-size:0.72rem;color:var(--teal);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Positivo</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:8px">
            <div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:#64748b">${qual.sentiment.neutro.toLocaleString("es-MX")}</div>
            <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Neutro</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--accent-bg);border-radius:8px">
            <div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:var(--accent)">${qual.sentiment.negativo.toLocaleString("es-MX")}</div>
            <div style="font-size:0.72rem;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">Negativo</div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="card">
        <div class="card-title">Estadísticas de Respuesta</div>
        <div class="dist-bar-wrap" style="gap:14px">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;border-bottom:1px solid var(--border);padding-bottom:10px">
            <span style="color:var(--ink-muted)">Total respuestas</span>
            <span style="font-weight:700">${qual.summary.total_responses.toLocaleString("es-MX")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;border-bottom:1px solid var(--border);padding-bottom:10px">
            <span style="color:var(--ink-muted)">Respuestas válidas</span>
            <span style="font-weight:700">${qual.summary.valid_responses.toLocaleString("es-MX")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;border-bottom:1px solid var(--border);padding-bottom:10px">
            <span style="color:var(--ink-muted)">Respuestas cortas</span>
            <span style="font-weight:700">${qual.summary.short_responses.toLocaleString("es-MX")}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem">
            <span style="color:var(--ink-muted)">Longitud promedio</span>
            <span style="font-weight:700">${qual.summary.avg_length.toFixed(0)} caracteres</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Trigrams -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-title">Trigramas más frecuentes</div>
      <div class="card-subtitle">Expresiones de tres palabras más repetidas en las respuestas</div>
      ${buildTrigramList(qual.top_trigrams, maxTrigram, "blue")}
    </div>

    <!-- Words + Phrases -->
    <div class="grid-2" style="margin-bottom:20px">
      <div class="card">
        <div class="card-title">Palabras clave</div>
        ${buildWordCloud(qual.top_words)}
      </div>
      <div class="card">
        <div class="card-title">Frases frecuentes</div>
        ${qual.top_phrases.slice(0, 8).map((p) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0eeea;font-size:0.85rem">
            <span>"${escapeHtml(p.phrase)}"</span>
            <span style="font-weight:700;color:var(--ink-muted);font-size:0.78rem">${p.count}×</span>
          </div>`).join("")}
      </div>
    </div>

    <!-- Findings -->
    ${(qual.highlights.positive.length + qual.highlights.negative.length + qual.suggestions.length) > 0 ? `
    <div style="margin-bottom:20px">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px;color:var(--ink)">Hallazgos y recomendaciones</h3>
      ${buildFindings(qual.highlights, qual.suggestions)}
    </div>` : ""}
  </div>`;
}

// ── Quantitative Section Builder ───────────────────────────────────────────

function buildQuantSection(q: QuestionResult, idx: number, chartId: string): string {
  const quant = q.quantitative!;
  const s = quant.summary;
  const color = getMeanColorHex(s.mean);
  const bg = getMeanBgHex(s.mean);
  const sectionNum = String(idx + 1).padStart(2, "0");

  const distData = [1, 2, 3, 4, 5].map((v) => {
    const d = quant.distribution[String(v)] || { count: 0, pct: 0 };
    return { label: String(v), count: d.count, pct: d.pct };
  });

  return `<div id="quant-${q.question_number}" class="section">
    <div class="section-label">${sectionNum} — Pregunta ${q.question_number} · Cuantitativa</div>
    <div class="section-title">Análisis Estadístico</div>
    <p class="section-desc">${q.total_responses.toLocaleString("es-MX")} respuestas en escala 1–5.</p>

    <!-- Stats row -->
    <div class="quant-stats">
      <div class="quant-stat" style="border-left:3px solid ${color}">
        <div class="quant-stat-value" style="color:${color}">${s.mean.toFixed(2)}</div>
        <div class="quant-stat-label">Promedio</div>
      </div>
      <div class="quant-stat">
        <div class="quant-stat-value">${s.median.toFixed(1)}</div>
        <div class="quant-stat-label">Mediana</div>
      </div>
      <div class="quant-stat">
        <div class="quant-stat-value">${s.std_dev.toFixed(2)}</div>
        <div class="quant-stat-label">Desv. Est.</div>
      </div>
      <div class="quant-stat">
        <div class="quant-stat-value">${s.valid.toLocaleString("es-MX")}</div>
        <div class="quant-stat-label">Válidas</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Distribution bars -->
      <div class="card">
        <div class="card-title">Distribución de respuestas</div>
        ${buildDistBars(quant.distribution)}
      </div>

      <!-- Chart.js donut -->
      <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div class="card-title" style="align-self:flex-start">Promedio por calificación</div>
        <canvas id="${chartId}" style="max-height:240px"></canvas>
      </div>
    </div>
  </div>`;
}

// ── Quantitative Chart.js Initializer ─────────────────────────────────────

function buildQuantChartScript(q: QuestionResult, chartId: string): string {
  const quant = q.quantitative!;
  const counts = [1, 2, 3, 4, 5].map((v) => (quant.distribution[String(v)] || { count: 0 }).count);
  const colors = DIST_COLORS.map((c) => c);

  return `new Chart(document.getElementById('${chartId}'), {
    type: 'bar',
    data: {
      labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
      datasets: [{
        data: [${counts.join(",")}],
        backgroundColor: ${JSON.stringify(colors)},
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ' ' + c.raw + ' respuestas' } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'DM Sans' } } },
        x: { grid: { display: false }, ticks: { font: { family: 'DM Sans' } } }
      }
    }
  });`;
}

// ── Department Section Builder ─────────────────────────────────────────────

function buildDeptSection(data: MultiExportData): string {
  const quantQs = data.questions.filter((q) => q.analysis_type === "quantitative" && q.quantitative);
  const qualQs = data.questions.filter((q) => q.analysis_type === "qualitative" && q.by_group);

  if (!data.config.group_by) return "";

  // Collect all departments
  const depts = new Set<string>();
  data.questions.forEach((q) => {
    if (q.by_group) Object.keys(q.by_group).forEach((d) => depts.add(d));
  });
  if (!depts.size) return "";

  const deptList = Array.from(depts).sort();

  // Calculate overall mean per dept (average across quant questions)
  const deptMeans: Record<string, number> = {};
  deptList.forEach((dept) => {
    const means: number[] = [];
    quantQs.forEach((q) => {
      const qd = q.quantitative?.by_group?.[dept] ?? q.by_group?.[dept];
      const m = qd?.summary?.mean ?? qd?.quantitative?.summary?.mean;
      if (typeof m === "number") means.push(m);
    });
    deptMeans[dept] = means.length ? means.reduce((a, b) => a + b, 0) / means.length : 0;
  });

  const maxMean = Math.max(...Object.values(deptMeans), 5);
  const sortedDepts = deptList.sort((a, b) => (deptMeans[b] || 0) - (deptMeans[a] || 0));

  const tableRows = sortedDepts.map((dept, i) => {
    const mean = deptMeans[dept] || 0;
    const color = getMeanColorHex(mean);
    const pct = (mean / maxMean) * 100;
    return `<tr onclick="toggleDeptDetail('${escapeHtml(dept.replace(/'/g, "\\'"))}')">
      <td><span style="font-weight:600">${i + 1}.</span></td>
      <td style="font-weight:600">${escapeHtml(dept)}</td>
      ${quantQs.slice(0, 4).map((q) => {
      const qd = q.quantitative?.by_group?.[dept] ?? q.by_group?.[dept];
      const m = qd?.summary?.mean ?? qd?.quantitative?.summary?.mean ?? null;
      const mc = m !== null ? getMeanColorHex(m) : "#94a3b8";
      return `<td style="text-align:center"><span style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:${mc}">${m !== null ? m.toFixed(2) : "—"}</span></td>`;
    }).join("")}
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="dept-bar" style="flex:1">
            <div class="dept-bar-fill" style="width:${pct.toFixed(1)}%"></div>
          </div>
          <span style="font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:${color};min-width:36px;text-align:right">${mean.toFixed(2)}</span>
        </div>
      </td>
    </tr>`;
  }).join("");

  const deptDetails = sortedDepts.map((dept) => {
    const mean = deptMeans[dept] || 0;
    const color = getMeanColorHex(mean);
    const qualDetail = qualQs.map((q) => {
      const qd = q.by_group?.[dept];
      if (!qd) return "";
      const qual: GroupData = qd.qualitative ?? qd;
      if (!qual?.top_trigrams) return "";
      const maxTri = qual.top_trigrams[0]?.count || 1;
      return `<div style="margin-top:20px">
        <p style="font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink-muted);margin-bottom:12px">Pregunta ${q.question_number} — Trigramas</p>
        ${buildTrigramList(qual.top_trigrams, maxTri, "blue")}
      </div>`;
    }).join("");

    return `<div id="dept-detail-${escapeHtml(dept)}" class="dept-detail">
      <button class="back-btn" onclick="showDeptTable()">← Volver a la tabla</button>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <div style="width:48px;height:48px;border-radius:12px;background:${getMeanBgHex(mean)};display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:${color}">${mean.toFixed(1)}</div>
        <h3 style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700">${escapeHtml(dept)}</h3>
      </div>
      <div class="grid-2">
        ${quantQs.slice(0, 4).map((q) => {
      const qd = q.quantitative?.by_group?.[dept] ?? q.by_group?.[dept];
      const m = qd?.summary?.mean ?? qd?.quantitative?.summary?.mean ?? null;
      const dist = qd?.distribution ?? {};
      const mc = m !== null ? getMeanColorHex(m) : "#94a3b8";
      return `<div class="card">
            <div class="card-title">Pregunta ${q.question_number}</div>
            ${m !== null ? `<div style="font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:${mc};margin-bottom:12px">${m.toFixed(2)}</div>` : "<p>Sin datos</p>"}
            ${Object.keys(dist).length > 0 ? buildDistBars(dist) : ""}
          </div>`;
    }).join("")}
      </div>
      ${qualDetail}
    </div>`;
  }).join("");

  return `<div id="departments" class="section">
    <div class="section-label">${String(data.questions.length + 1).padStart(2, "0")} — Análisis Comparativo</div>
    <div class="section-title">Detalle por ${escapeHtml(data.config.group_by)}</div>
    <p class="section-desc">Haz clic en cualquier fila para ver el detalle completo de ese grupo.</p>

    <div id="dept-table-view">
      <div class="card" style="padding:0;overflow:hidden">
        <table class="dept-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(data.config.group_by)}</th>
              ${quantQs.slice(0, 4).map((q) => `<th style="text-align:center">P${q.question_number}</th>`).join("")}
              <th>Promedio general</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>

    ${deptDetails}
  </div>`;
}

// ── Nav Scroll JS ──────────────────────────────────────────────────────────

function buildNavScript(navIds: string[]): string {
  return `
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
const _navIds = ${JSON.stringify(navIds)};
function _updateNav() {
  const btns = document.querySelectorAll('.nav-btn');
  let active = _navIds[0];
  _navIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) active = id;
  });
  btns.forEach(b => {
    b.classList.toggle('active', b.dataset.target === active);
  });
}
window.addEventListener('scroll', _updateNav, { passive: true });
_updateNav();

function toggleDeptDetail(dept) {
  document.getElementById('dept-table-view').style.display = 'none';
  document.querySelectorAll('.dept-detail').forEach(el => el.classList.remove('active'));
  const detail = document.getElementById('dept-detail-' + dept);
  if (detail) detail.classList.add('active');
}
function showDeptTable() {
  document.getElementById('dept-table-view').style.display = 'block';
  document.querySelectorAll('.dept-detail').forEach(el => el.classList.remove('active'));
}
`;
}

// ── Multi-Question Premium HTML Report ────────────────────────────────────

export function downloadMultiHtmlReport(data: MultiExportData): void {
  const quantQs = data.questions.filter((q) => q.analysis_type === "quantitative" && q.quantitative);
  const qualQs = data.questions.filter((q) => q.analysis_type === "qualitative" && q.qualitative);
  const hasGroups = !!data.config.group_by;
  const hasAi = !!data.aiSummary;

  // Overall average mean across quant questions
  const allMeans = quantQs.map((q) => q.quantitative!.summary.mean);
  const overallMean = allMeans.length ? allMeans.reduce((a, b) => a + b, 0) / allMeans.length : null;

  // Overall sentiment across qual questions
  const totalPos = qualQs.reduce((a, q) => a + (q.qualitative?.sentiment.positivo ?? 0), 0);
  const totalNeg = qualQs.reduce((a, q) => a + (q.qualitative?.sentiment.negativo ?? 0), 0);
  const totalNeu = qualQs.reduce((a, q) => a + (q.qualitative?.sentiment.neutro ?? 0), 0);

  const dateStr = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  // Build nav items
  const navItems: { id: string; label: string }[] = [{ id: "overview", label: "Panorama" }];
  if (quantQs.length) navItems.push({ id: "quant-section", label: `Cuantitativo (${quantQs.length})` });
  if (qualQs.length) navItems.push({ id: "qual-section", label: `Cualitativo (${qualQs.length})` });
  if (hasGroups) navItems.push({ id: "departments", label: `Por ${data.config.group_by}` });
  if (hasAi) navItems.push({ id: "ai-summary", label: "Resumen IA" });

  const navIds = navItems.map((n) => n.id);

  // ── Sections HTML ──
  const overviewSection = `<section id="overview" class="section">
    <div class="section-label">01 — Panorama General</div>
    <div class="section-title">Resumen Ejecutivo</div>
    <p class="section-desc">Análisis basado en ${data.config.total_rows.toLocaleString("es-MX")} registros del archivo <em>${escapeHtml(data.config.file)}</em>. Generado el ${dateStr}.</p>

    <div class="grid-4" style="margin-bottom:28px">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#eff6ff">📋</div>
        <div class="kpi-value">${data.questions.length}</div>
        <div class="kpi-label">Preguntas analizadas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--accent-bg)">📊</div>
        <div class="kpi-value">${quantQs.length}</div>
        <div class="kpi-label">Cuantitativas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--teal-bg)">💬</div>
        <div class="kpi-value">${qualQs.length}</div>
        <div class="kpi-label">Cualitativas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:var(--surface-warm)">📁</div>
        <div class="kpi-value">${data.config.total_rows.toLocaleString("es-MX")}</div>
        <div class="kpi-label">Registros totales</div>
      </div>
    </div>

    ${quantQs.length > 0 ? `
    <div class="grid-${Math.min(quantQs.length, 4)}" style="margin-bottom:28px">
      ${quantQs.slice(0, 8).map((q) => {
    const s = q.quantitative!.summary;
    const color = getMeanColorHex(s.mean);
    const bg = getMeanBgHex(s.mean);
    return `<div class="kpi-card" style="border-top:3px solid ${color}">
          <div class="kpi-value" style="color:${color}">${s.mean.toFixed(2)}</div>
          <div class="kpi-label">Pregunta ${q.question_number}</div>
          <div style="font-size:0.72rem;color:var(--ink-muted);margin-top:4px">${s.total.toLocaleString("es-MX")} resp.</div>
        </div>`;
  }).join("")}
    </div>` : ""}

    ${qualQs.length > 0 ? `
    <div class="card">
      <div class="card-title">Sentimiento global (cualitativo)</div>
      ${buildSentimentBar({ positivo: totalPos, negativo: totalNeg, neutro: totalNeu })}
    </div>` : ""}
  </section>`;

  // Quantitative group section
  const quantGroupSection = quantQs.length ? `<section id="quant-section" class="section" style="margin-bottom:0">
    <div class="section-label">02 — Análisis Cuantitativo</div>
    <div class="section-title">Preguntas en Escala 1–5</div>
    <p class="section-desc">Distribución estadística y promedios por pregunta.</p>
  </section>
  ${quantQs.map((q, i) => buildQuantSection(q, i, `chart-quant-${q.question_number}`)).join("")}` : "";

  // Qualitative group section
  const qualGroupSection = qualQs.length ? `<section id="qual-section" class="section" style="margin-bottom:0">
    <div class="section-label">${String(quantQs.length > 0 ? 3 : 2).padStart(2, "0")} — Análisis Cualitativo</div>
    <div class="section-title">Preguntas de Respuesta Abierta</div>
    <p class="section-desc">Análisis textual, sentimiento y trigramas de las respuestas abiertas.</p>
  </section>
  ${qualQs.map((q, i) => buildQualSection(q, i)).join("")}` : "";

  // AI summary section
  const aiSection = hasAi ? `<section id="ai-summary" class="section">
    <div class="section-label">IA — Resumen Inteligente</div>
    <div class="section-title">Análisis con Inteligencia Artificial</div>
    <p class="section-desc">Resumen generado por modelo de lenguaje basado en los datos del análisis.</p>
    <div class="card">
      <div class="ai-prose">
        <p style="margin:10px 0">${markdownToHtml(data.aiSummary!)}</p>
      </div>
    </div>
  </section>` : "";

  const deptSection = buildDeptSection(data);

  // Chart.js initializers
  const chartScripts = quantQs.map((q) =>
    buildQuantChartScript(q, `chart-quant-${q.question_number}`)
  ).join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte — ${escapeHtml(data.config.file)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
${PREMIUM_CSS}
</style>
</head>
<body>

<!-- HERO -->
<header class="hero">
  <div class="hero-inner">
    <div class="hero-badge">📊 EvalPlatform · Evaluación Docente</div>
    <h1>Reporte de <em>Evaluación</em><br>Docente</h1>
    <p class="hero-sub">${escapeHtml(data.config.file)} · ${dateStr}</p>
    <div class="hero-stats">
      ${overallMean !== null ? `<div class="hero-stat">
        <div class="hero-stat-value">${overallMean.toFixed(2)}</div>
        <div class="hero-stat-label">Promedio general</div>
      </div>` : ""}
      <div class="hero-stat">
        <div class="hero-stat-value">${data.config.total_rows.toLocaleString("es-MX")}</div>
        <div class="hero-stat-label">Registros</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-value">${data.questions.length}</div>
        <div class="hero-stat-label">Preguntas</div>
      </div>
      ${qualQs.length > 0 ? `<div class="hero-stat">
        <div class="hero-stat-value">${((totalPos / (totalPos + totalNeg + totalNeu || 1)) * 100).toFixed(0)}%</div>
        <div class="hero-stat-label">Sentimiento positivo</div>
      </div>` : ""}
    </div>
  </div>
</header>

<!-- STICKY NAV -->
<nav class="nav-bar">
  <div class="nav-inner">
    ${navItems.map((n) => `<button class="nav-btn" data-target="${n.id}" onclick="scrollToSection('${n.id}')">${n.label}</button>`).join("")}
  </div>
</nav>

<!-- CONTENT -->
<main class="container">
  ${overviewSection}
  ${quantGroupSection}
  ${qualGroupSection}
  ${deptSection}
  ${aiSection}
</main>

<footer style="text-align:center;padding:32px;font-size:0.78rem;color:var(--ink-muted);border-top:1px solid var(--border);margin-top:40px">
  Generado por <strong>EvalPlatform</strong> · ${dateStr}
</footer>

<script>
${buildNavScript(navIds)}
${chartScripts}
</script>
</body>
</html>`;

  downloadFile(html, `reporte-${data.config.file.replace(/\.[^.]+$/, "")}-${Date.now()}.html`, "text/html");
}

// ── Legacy single-question HTML export ────────────────────────────────────

export function downloadHtmlReport(data: ExportData): void {
  const general = data.general;
  const byGroup = data.by_group;
  const dateStr = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  const totalSentiment = general.sentiment.positivo + general.sentiment.negativo + general.sentiment.neutro || 1;
  const maxTrigram = general.top_trigrams[0]?.count || 1;
  const maxWord = general.top_words[0]?.count || 1;

  const deptNames = byGroup ? Object.keys(byGroup).sort() : [];
  const deptMeans: Record<string, number> = {};
  if (byGroup) {
    deptNames.forEach((d) => {
      const s = byGroup[d].sentiment;
      deptMeans[d] = ((s.positivo / (s.positivo + s.negativo + s.neutro || 1)) * 100);
    });
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte — ${escapeHtml(data.config.file)}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
<style>
${PREMIUM_CSS}
</style>
</head>
<body>
<header class="hero">
  <div class="hero-inner">
    <div class="hero-badge">📊 EvalPlatform · Reporte Cualitativo</div>
    <h1>Análisis de <em>Respuestas</em><br>Docentes</h1>
    <p class="hero-sub">${escapeHtml(data.config.file)} · ${dateStr}</p>
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="hero-stat-value">${general.summary.total_responses.toLocaleString("es-MX")}</div>
        <div class="hero-stat-label">Respuestas</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-value">${((general.sentiment.positivo / totalSentiment) * 100).toFixed(0)}%</div>
        <div class="hero-stat-label">Positivo</div>
      </div>
      ${deptNames.length ? `<div class="hero-stat">
        <div class="hero-stat-value">${deptNames.length}</div>
        <div class="hero-stat-label">Departamentos</div>
      </div>` : ""}
    </div>
  </div>
</header>

<nav class="nav-bar">
  <div class="nav-inner">
    <button class="nav-btn active" data-target="overview" onclick="scrollToSection('overview')">Panorama</button>
    <button class="nav-btn" data-target="words" onclick="scrollToSection('words')">Palabras clave</button>
    ${deptNames.length ? `<button class="nav-btn" data-target="departments" onclick="scrollToSection('departments')">Departamentos</button>` : ""}
    <button class="nav-btn" data-target="findings" onclick="scrollToSection('findings')">Hallazgos</button>
    ${data.aiSummary ? `<button class="nav-btn" data-target="ai-summary" onclick="scrollToSection('ai-summary')">Resumen IA</button>` : ""}
  </div>
</nav>

<main class="container">
  <section id="overview" class="section">
    <div class="section-label">01 — Panorama General</div>
    <div class="section-title">Análisis de Sentimiento</div>
    <p class="section-desc">Basado en ${general.summary.total_responses.toLocaleString("es-MX")} respuestas del archivo <em>${escapeHtml(data.config.file)}</em>.</p>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Distribución de sentimiento</div>
        ${buildSentimentBar(general.sentiment)}
      </div>
      <div class="card">
        <div class="card-title">Estadísticas</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${[
    ["Total respuestas", general.summary.total_responses.toLocaleString("es-MX")],
    ["Respuestas válidas", general.summary.valid_responses.toLocaleString("es-MX")],
    ["Longitud promedio", general.summary.avg_length.toFixed(0) + " caracteres"],
  ].map(([l, v]) => `<div style="display:flex;justify-content:space-between;font-size:0.88rem;border-bottom:1px solid #f0eeea;padding-bottom:10px"><span style="color:var(--ink-muted)">${l}</span><strong>${v}</strong></div>`).join("")}
        </div>
      </div>
    </div>
  </section>

  <section id="words" class="section">
    <div class="section-label">02 — Análisis Textual</div>
    <div class="section-title">Palabras y Expresiones Clave</div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Palabras más frecuentes</div>
        ${buildWordCloud(general.top_words)}
      </div>
      <div class="card">
        <div class="card-title">Trigramas más frecuentes</div>
        ${buildTrigramList(general.top_trigrams, maxTrigram, "blue")}
      </div>
    </div>
  </section>

  ${deptNames.length ? `<section id="departments" class="section">
    <div class="section-label">03 — Por Departamento</div>
    <div class="section-title">Análisis Departamental</div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="dept-table">
        <thead><tr><th>#</th><th>Departamento</th><th>Positivo %</th><th>Distribución</th></tr></thead>
        <tbody>
          ${deptNames.sort((a, b) => (deptMeans[b] || 0) - (deptMeans[a] || 0)).map((dept, i) => {
      const s = byGroup![dept].sentiment;
      const pctPos = ((s.positivo / (s.positivo + s.negativo + s.neutro || 1)) * 100).toFixed(1);
      return `<tr>
              <td>${i + 1}</td>
              <td style="font-weight:600">${escapeHtml(dept)}</td>
              <td style="color:var(--teal);font-weight:700">${pctPos}%</td>
              <td><div class="dept-bar" style="min-width:160px"><div class="dept-bar-fill" style="width:${pctPos}%"></div></div></td>
            </tr>`;
    }).join("")}
        </tbody>
      </table>
    </div>
  </section>` : ""}

  <section id="findings" class="section">
    <div class="section-label">${deptNames.length ? "04" : "03"} — Hallazgos</div>
    <div class="section-title">Fortalezas y Áreas de Oportunidad</div>
    ${buildFindings(general.highlights, general.suggestions)}
  </section>

  ${data.aiSummary ? `<section id="ai-summary" class="section">
    <div class="section-label">IA — Resumen Inteligente</div>
    <div class="section-title">Análisis con Inteligencia Artificial</div>
    <div class="card"><div class="ai-prose"><p style="margin:10px 0">${markdownToHtml(data.aiSummary)}</p></div></div>
  </section>` : ""}
</main>

<footer style="text-align:center;padding:32px;font-size:0.78rem;color:var(--ink-muted);border-top:1px solid var(--border);margin-top:40px">
  Generado por <strong>EvalPlatform</strong> · ${dateStr}
</footer>

<script>
${buildNavScript(["overview", "words", ...(deptNames.length ? ["departments"] : []), "findings", ...(data.aiSummary ? ["ai-summary"] : [])])}
</script>
</body>
</html>`;

  downloadFile(html, `reporte-${data.config.file.replace(/\.[^.]+$/, "")}-${Date.now()}.html`, "text/html");
}

// ── File Download Helper ───────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
