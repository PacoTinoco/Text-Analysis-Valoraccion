// Genera un archivo HTML autocontenido con el reporte completo
// Incluye Chart.js desde CDN para gráficas interactivas
// Soporta formato legacy (single qualitative) y multi-pregunta (Phase 2)

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
  config: { file: string; pregunta_column: string; respuesta_column: string; group_by: string | null; total_rows: number };
  aiSummary?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="section-subtitle">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="section-title">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="report-title">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="bullet-list">$&</ul>')
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function getMeanColorHex(mean: number): string {
  if (mean >= 4.5) return "#059669";
  if (mean >= 3.5) return "#2563eb";
  if (mean >= 2.5) return "#d97706";
  return "#dc2626";
}

const DIST_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981"];

// ── Shared CSS ──

const SHARED_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #334155; line-height: 1.6; }
  .container { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
  .header { background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 48px 40px; border-radius: 16px; margin-bottom: 32px; }
  .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .header p { opacity: 0.85; font-size: 15px; }
  .header .meta { margin-top: 16px; display: flex; gap: 24px; flex-wrap: wrap; font-size: 13px; opacity: 0.8; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card .label { font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px; }
  .card .value { font-size: 24px; font-weight: 700; color: #0f172a; }
  .section { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 24px; }
  .section-title { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .section-subtitle { font-size: 15px; font-weight: 600; color: #1e293b; margin: 20px 0 8px; }
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  @media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } }
  .chart-box { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .chart-box h3 { font-size: 15px; font-weight: 600; margin-bottom: 16px; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; padding: 10px 12px; color: #64748b; font-weight: 500; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:hover { background: #f8fafc; }
  .badge-pos { color: #059669; font-weight: 600; }
  .badge-neg { color: #dc2626; font-weight: 600; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { padding: 4px 10px; background: #f1f5f9; border-radius: 20px; font-size: 12px; color: #475569; }
  .tag-blue { background: #eff6ff; color: #1d4ed8; }
  .tag-purple { background: #f5f3ff; color: #7c3aed; }
  .response { padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; line-height: 1.6; }
  .response-pos { background: #ecfdf5; border-left: 3px solid #10b981; }
  .response-neg { background: #fef2f2; border-left: 3px solid #ef4444; }
  .response-sug { background: #fffbeb; border-left: 3px solid #f59e0b; }
  .ai-summary { background: linear-gradient(135deg, #faf5ff, #eff6ff); border: 1px solid #e9d5ff; border-radius: 12px; padding: 28px; margin-bottom: 24px; }
  .ai-summary h2 { color: #6d28d9; margin-bottom: 16px; }
  .ai-summary p { margin-bottom: 12px; }
  .ai-summary ul, .ai-summary .bullet-list { margin: 8px 0 12px 20px; }
  .ai-summary li { margin-bottom: 6px; }
  .dept-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 12px; overflow: hidden; }
  .dept-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s; }
  .dept-header:hover { background: #f8fafc; }
  .dept-header h3 { font-size: 15px; font-weight: 600; color: #0f172a; }
  .dept-meta { font-size: 12px; color: #94a3b8; }
  .dept-badges { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .chevron { transition: transform 0.3s; color: #94a3b8; }
  .dept-card.open .chevron { transform: rotate(180deg); }
  .dept-body { display: none; padding: 0 20px 20px; border-top: 1px solid #f1f5f9; }
  .dept-card.open .dept-body { display: block; }
  .sentiment-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0; }
  .sentiment-block { padding: 12px; border-radius: 8px; text-align: center; }
  .sentiment-block.pos { background: #ecfdf5; }
  .sentiment-block.neu { background: #f8fafc; }
  .sentiment-block.neg { background: #fef2f2; }
  .sentiment-num { font-size: 22px; font-weight: 700; }
  .sentiment-block.pos .sentiment-num { color: #059669; }
  .sentiment-block.neu .sentiment-num { color: #64748b; }
  .sentiment-block.neg .sentiment-num { color: #dc2626; }
  .sentiment-label { font-size: 11px; color: #64748b; margin-top: 2px; }
  .subsection { margin-top: 16px; }
  .subsection h4 { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
  .footer { text-align: center; padding: 32px; color: #94a3b8; font-size: 12px; }
  .dist-bar { display: flex; gap: 2px; height: 24px; border-radius: 6px; overflow: hidden; margin: 8px 0; }
  .dist-segment { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: white; }
  .q-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; border-left: 4px solid; }
  .q-card.quant { border-left-color: #3b82f6; }
  .q-card.qual { border-left-color: #8b5cf6; }
  .q-card h3 { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
  .q-meta { font-size: 12px; color: #94a3b8; margin-bottom: 16px; }
  .q-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .q-badge.quant { background: #eff6ff; color: #2563eb; }
  .q-badge.qual { background: #f5f3ff; color: #7c3aed; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .stat-box { background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-box .stat-val { font-size: 20px; font-weight: 700; }
  .stat-box .stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }
  .compare-table th { text-align: center; }
  .compare-table td { text-align: center; }
  .compare-table td:first-child, .compare-table th:first-child { text-align: left; }
  @media print { body { background: white; } .container { padding: 0; } .dept-body { display: block !important; } .header { break-after: avoid; } .section, .q-card { break-inside: avoid; } }
`;

// ── Legacy export functions (single qualitative) ──

function buildDeptRows(by_group: Record<string, GroupData>): string {
  const sorted = Object.entries(by_group)
    .map(([name, d]) => {
      const total = d.summary.valid_responses || 1;
      return { name, responses: d.summary.valid_responses, pos: Math.round((d.sentiment.positivo / total) * 100), neg: Math.round((d.sentiment.negativo / total) * 100), suggestions: d.suggestions.length };
    })
    .sort((a, b) => b.pos - a.pos);
  return sorted.map((d, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHtml(d.name)}</strong></td><td>${d.responses.toLocaleString()}</td><td><span class="badge-pos">${d.pos}%</span></td><td><span class="${d.neg >= 20 ? "badge-neg" : ""}">${d.neg}%</span></td><td>${d.suggestions}</td></tr>`).join("");
}

function buildDeptSections(by_group: Record<string, GroupData>): string {
  return Object.entries(by_group)
    .sort(([, a], [, b]) => b.summary.valid_responses - a.summary.valid_responses)
    .map(([name, d]) => {
      const total = d.summary.valid_responses || 1;
      const pos = Math.round((d.sentiment.positivo / total) * 100);
      const neu = Math.round((d.sentiment.neutro / total) * 100);
      const neg = Math.round((d.sentiment.negativo / total) * 100);
      const words = d.top_words.slice(0, 10).map((w) => `<span class="tag">${escapeHtml(w.word)} (${w.count})</span>`).join(" ");
      const trigrams = d.top_trigrams.slice(0, 5).map((t) => `<span class="tag tag-blue">${escapeHtml(t.phrase)} (${t.count})</span>`).join(" ");
      const names = d.top_names.slice(0, 5).map((n) => `<span class="tag tag-purple">${escapeHtml(n.name)} (${n.count})</span>`).join(" ");
      const posH = d.highlights.positive.slice(0, 3).map((r) => `<div class="response response-pos">${escapeHtml(r)}</div>`).join("");
      const negH = d.highlights.negative.slice(0, 3).map((r) => `<div class="response response-neg">${escapeHtml(r)}</div>`).join("");
      const sugs = d.suggestions.slice(0, 3).map((r) => `<div class="response response-sug">${escapeHtml(r)}</div>`).join("");
      return `<div class="dept-card"><div class="dept-header" onclick="this.parentElement.classList.toggle('open')"><div><h3>${escapeHtml(name)}</h3><span class="dept-meta">${d.summary.valid_responses.toLocaleString()} respuestas</span></div><div class="dept-badges"><span class="badge-pos">${pos}% pos</span><span class="badge-neg">${neg}% neg</span><span class="chevron">▼</span></div></div><div class="dept-body"><div class="sentiment-row"><div class="sentiment-block pos"><div class="sentiment-num">${pos}%</div><div class="sentiment-label">Positivo</div></div><div class="sentiment-block neu"><div class="sentiment-num">${neu}%</div><div class="sentiment-label">Neutro</div></div><div class="sentiment-block neg"><div class="sentiment-num">${neg}%</div><div class="sentiment-label">Negativo</div></div></div><div class="subsection"><h4>Palabras clave</h4><div class="tags">${words}</div></div>${trigrams ? `<div class="subsection"><h4>Frases frecuentes</h4><div class="tags">${trigrams}</div></div>` : ""}${names ? `<div class="subsection"><h4>Nombres</h4><div class="tags">${names}</div></div>` : ""}${posH ? `<div class="subsection"><h4>Positivas</h4>${posH}</div>` : ""}${negH ? `<div class="subsection"><h4>Oportunidad</h4>${negH}</div>` : ""}${sugs ? `<div class="subsection"><h4>Sugerencias</h4>${sugs}</div>` : ""}</div></div>`;
    }).join("");
}

export function generateHtmlReport(data: ExportData): string {
  const { general, by_group, config, aiSummary } = data;
  const s = general.summary;
  const sent = general.sentiment;
  const total = s.valid_responses || 1;
  const deptCount = by_group ? Object.keys(by_group).length : 0;
  const now = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  const wordLabels = JSON.stringify(general.top_words.slice(0, 12).map((w) => w.word));
  const wordValues = JSON.stringify(general.top_words.slice(0, 12).map((w) => w.count));

  const deptChartLabels = by_group ? JSON.stringify(Object.entries(by_group).sort(([, a], [, b]) => b.summary.valid_responses - a.summary.valid_responses).slice(0, 12).map(([n]) => n)) : "[]";
  const deptChartPos = by_group ? JSON.stringify(Object.entries(by_group).sort(([, a], [, b]) => b.summary.valid_responses - a.summary.valid_responses).slice(0, 12).map(([, d]) => Math.round((d.sentiment.positivo / (d.summary.valid_responses || 1)) * 100))) : "[]";
  const deptChartNeg = by_group ? JSON.stringify(Object.entries(by_group).sort(([, a], [, b]) => b.summary.valid_responses - a.summary.valid_responses).slice(0, 12).map(([, d]) => Math.round((d.sentiment.negativo / (d.summary.valid_responses || 1)) * 100))) : "[]";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reporte - ${escapeHtml(config.file)}</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4"><\/script><style>${SHARED_CSS}</style></head><body><div class="container">
<div class="header"><h1>Reporte de Evaluaciones Docentes</h1><p>${escapeHtml(config.file)}</p><div class="meta"><span>${now}</span><span>${s.total_responses.toLocaleString()} respuestas</span><span>${s.valid_responses.toLocaleString()} validas</span><span>${deptCount} departamentos</span></div></div>
<div class="cards"><div class="card"><div class="label">Total</div><div class="value">${s.total_responses.toLocaleString()}</div></div><div class="card"><div class="label">Validas</div><div class="value">${s.valid_responses.toLocaleString()}</div></div><div class="card"><div class="label">Long. Prom</div><div class="value">${Math.round(s.avg_length)}</div></div><div class="card"><div class="label">Sugerencias</div><div class="value">${general.suggestions.length}</div></div><div class="card"><div class="label">Departamentos</div><div class="value">${deptCount}</div></div></div>
${aiSummary ? `<div class="ai-summary"><h2>Resumen IA</h2>${markdownToHtml(aiSummary)}</div>` : ""}
<div class="charts-grid"><div class="chart-box"><h3>Sentimiento</h3><canvas id="sentimentChart"></canvas></div><div class="chart-box"><h3>Palabras Frecuentes</h3><canvas id="wordsChart"></canvas></div></div>
${by_group ? `<div class="charts-grid"><div class="chart-box" style="grid-column:1/-1;"><h3>Sentimiento por Departamento</h3><canvas id="deptChart" height="${Math.max(80, Object.keys(by_group).length * 25)}"></canvas></div></div><div class="section"><h2 class="section-title">Ranking</h2><table><thead><tr><th>#</th><th>Departamento</th><th>Resp.</th><th>% Pos</th><th>% Neg</th><th>Sug.</th></tr></thead><tbody>${buildDeptRows(by_group)}</tbody></table></div><div class="section"><h2 class="section-title">Detalle por Departamento</h2><p style="font-size:13px;color:#64748b;margin-bottom:16px;">Clic para expandir</p>${buildDeptSections(by_group)}</div>` : ""}
<div class="section"><h2 class="section-title">Respuestas Destacadas</h2><div class="subsection"><h4>Positivas</h4>${general.highlights.positive.slice(0, 5).map((r) => `<div class="response response-pos">${escapeHtml(r)}</div>`).join("")}${general.highlights.positive.length === 0 ? '<p style="color:#94a3b8;font-size:13px;">No se encontraron</p>' : ""}</div><div class="subsection"><h4>Areas de Oportunidad</h4>${general.highlights.negative.slice(0, 5).map((r) => `<div class="response response-neg">${escapeHtml(r)}</div>`).join("")}${general.highlights.negative.length === 0 ? '<p style="color:#94a3b8;font-size:13px;">No se encontraron</p>' : ""}</div>${general.suggestions.length > 0 ? `<div class="subsection"><h4>Sugerencias</h4>${general.suggestions.slice(0, 5).map((r) => `<div class="response response-sug">${escapeHtml(r)}</div>`).join("")}</div>` : ""}</div>
<div class="footer">Generado por EvalPlatform &middot; ${now}</div></div>
<script>
new Chart(document.getElementById('sentimentChart'),{type:'doughnut',data:{labels:['Positivo','Neutro','Negativo'],datasets:[{data:[${sent.positivo},${sent.neutro},${sent.negativo}],backgroundColor:['#10b981','#94a3b8','#ef4444'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
new Chart(document.getElementById('wordsChart'),{type:'bar',data:{labels:${wordLabels},datasets:[{data:${wordValues},backgroundColor:'#3b82f6',borderRadius:4}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}}}}});
${by_group ? `new Chart(document.getElementById('deptChart'),{type:'bar',data:{labels:${deptChartLabels},datasets:[{label:'Positivo',data:${deptChartPos},backgroundColor:'#10b981'},{label:'Negativo',data:${deptChartNeg},backgroundColor:'#ef4444'}]},options:{indexAxis:'y',responsive:true,scales:{x:{max:100,ticks:{callback:v=>v+'%'}}}}});` : ""}
<\/script></body></html>`;
}

// ── Multi-question export (Phase 2) ──

function buildQuantSection(q: QuestionResult, chartId: string): string {
  const qr = q.quantitative!;
  const s = qr.summary;
  const dist = qr.distribution;

  // Distribution bar
  const distBar = ["1", "2", "3", "4", "5"].map((v, i) => {
    const pct = dist[v]?.pct || 0;
    return pct > 0 ? `<div class="dist-segment" style="width:${Math.max(pct, 5)}%;background:${DIST_COLORS[i]}">${pct}%</div>` : "";
  }).join("");

  // Distribution detail
  const distDetail = ["1", "2", "3", "4", "5"].map((v, i) => {
    const d = dist[v] || { count: 0, pct: 0 };
    return `<div class="stat-box"><div class="stat-val" style="color:${DIST_COLORS[i]}">${d.pct}%</div><div class="stat-label">Valor ${v} (${d.count})</div></div>`;
  }).join("");

  // Group comparison table
  let groupTable = "";
  if (q.by_group && typeof q.by_group === "object") {
    const groups = Object.entries(q.by_group as Record<string, QuantResult>)
      .map(([name, gd]) => ({ name, mean: gd.summary.mean, median: gd.summary.median, std_dev: gd.summary.std_dev, valid: gd.summary.valid }))
      .sort((a, b) => b.mean - a.mean);

    const rows = groups.map((g, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHtml(g.name)}</strong></td><td style="color:${getMeanColorHex(g.mean)};font-weight:700">${g.mean.toFixed(2)}</td><td>${g.median.toFixed(1)}</td><td>${g.std_dev.toFixed(2)}</td><td>${g.valid.toLocaleString()}</td></tr>`).join("");

    groupTable = `<div style="margin-top:16px"><h4 style="font-size:14px;font-weight:600;color:#475569;margin-bottom:8px;">Promedio por grupo</h4><table><thead><tr><th>#</th><th>Grupo</th><th>Promedio</th><th>Mediana</th><th>Desv.</th><th>Resp.</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  return `
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-val" style="color:${getMeanColorHex(s.mean)}">${s.mean.toFixed(2)}</div><div class="stat-label">Promedio</div></div>
      <div class="stat-box"><div class="stat-val">${s.median.toFixed(1)}</div><div class="stat-label">Mediana</div></div>
      <div class="stat-box"><div class="stat-val">${s.std_dev.toFixed(2)}</div><div class="stat-label">Desv. Est.</div></div>
      <div class="stat-box"><div class="stat-val">${s.valid.toLocaleString()}</div><div class="stat-label">Respuestas</div></div>
    </div>
    <h4 style="font-size:13px;font-weight:600;color:#475569;margin-bottom:4px;">Distribucion (1-5)</h4>
    <div class="dist-bar">${distBar}</div>
    <div class="stat-grid" style="grid-template-columns:repeat(5,1fr)">${distDetail}</div>
    <div style="margin-top:12px"><canvas id="${chartId}" height="180"></canvas></div>
    ${groupTable}`;
}

function buildQualSection(q: QuestionResult): string {
  const qd = q.qualitative!;
  const total = qd.summary.valid_responses || 1;
  const posPct = Math.round((qd.sentiment.positivo / total) * 100);
  const neuPct = Math.round((qd.sentiment.neutro / total) * 100);
  const negPct = Math.round((qd.sentiment.negativo / total) * 100);

  const words = qd.top_words.slice(0, 10).map((w) => `<span class="tag">${escapeHtml(w.word)} (${w.count})</span>`).join(" ");
  const phrases = qd.top_phrases.slice(0, 8).map((p) => `<span class="tag tag-blue">${escapeHtml(p.phrase)} (${p.count})</span>`).join(" ");
  const trigrams = qd.top_trigrams.slice(0, 6).map((t) => `<span class="tag tag-blue">${escapeHtml(t.phrase)} (${t.count})</span>`).join(" ");
  const names = qd.top_names.slice(0, 8).map((n) => `<span class="tag tag-purple">${escapeHtml(n.name)} (${n.count})</span>`).join(" ");
  const posH = qd.highlights.positive.slice(0, 3).map((r) => `<div class="response response-pos">${escapeHtml(r)}</div>`).join("");
  const negH = qd.highlights.negative.slice(0, 3).map((r) => `<div class="response response-neg">${escapeHtml(r)}</div>`).join("");
  const sugs = qd.suggestions.slice(0, 3).map((r) => `<div class="response response-sug">${escapeHtml(r)}</div>`).join("");

  return `
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-val">${qd.summary.valid_responses.toLocaleString()}</div><div class="stat-label">Respuestas</div></div>
      <div class="stat-box"><div class="stat-val" style="color:#059669">${posPct}%</div><div class="stat-label">Positivo</div></div>
      <div class="stat-box"><div class="stat-val" style="color:#64748b">${neuPct}%</div><div class="stat-label">Neutro</div></div>
      <div class="stat-box"><div class="stat-val" style="color:#dc2626">${negPct}%</div><div class="stat-label">Negativo</div></div>
    </div>
    <div class="subsection"><h4>Palabras clave</h4><div class="tags">${words}</div></div>
    ${phrases ? `<div class="subsection"><h4>Bigramas</h4><div class="tags">${phrases}</div></div>` : ""}
    ${trigrams ? `<div class="subsection"><h4>Trigramas</h4><div class="tags">${trigrams}</div></div>` : ""}
    ${names ? `<div class="subsection"><h4>Nombres mencionados</h4><div class="tags">${names}</div></div>` : ""}
    ${posH ? `<div class="subsection"><h4>Respuestas positivas</h4>${posH}</div>` : ""}
    ${negH ? `<div class="subsection"><h4>Areas de oportunidad</h4>${negH}</div>` : ""}
    ${sugs ? `<div class="subsection"><h4>Sugerencias (${qd.suggestions.length})</h4>${sugs}</div>` : ""}`;
}

export function generateMultiHtmlReport(data: MultiExportData): string {
  const { questions, config, aiSummary } = data;
  const now = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  const quantQs = questions.filter((q) => q.analysis_type === "quantitative" && q.quantitative);
  const qualQs = questions.filter((q) => q.analysis_type === "qualitative" && q.qualitative);
  const totalResponses = questions.reduce((sum, q) => sum + q.total_responses, 0);

  // Build overall quantitative summary table
  let quantSummaryTable = "";
  if (quantQs.length > 0) {
    const rows = quantQs.map((q) => {
      const s = q.quantitative!.summary;
      const d = q.quantitative!.distribution;
      const distBar = ["1", "2", "3", "4", "5"].map((v, i) => {
        const pct = d[v]?.pct || 0;
        return pct > 0 ? `<div style="width:${Math.max(pct, 3)}%;background:${DIST_COLORS[i]};height:14px"></div>` : "";
      }).join("");
      return `<tr><td><strong>P${escapeHtml(q.question_number)}</strong></td><td style="color:${getMeanColorHex(s.mean)};font-weight:700">${s.mean.toFixed(2)}</td><td>${s.median.toFixed(1)}</td><td>${s.std_dev.toFixed(2)}</td><td>${s.valid.toLocaleString()}</td><td><div style="display:flex;gap:1px;border-radius:4px;overflow:hidden">${distBar}</div></td></tr>`;
    }).join("");
    quantSummaryTable = `<div class="section"><h2 class="section-title">Resumen Cuantitativo</h2><table><thead><tr><th>Pregunta</th><th>Promedio</th><th>Mediana</th><th>Desv.</th><th>Resp.</th><th>Distribucion</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // Build compare table (groups x questions) if there are groups
  let compareTable = "";
  if (quantQs.length > 0 && config.group_by) {
    const allGroups = new Set<string>();
    quantQs.forEach((q) => { if (q.by_group) Object.keys(q.by_group).forEach((g) => allGroups.add(g)); });
    const groupNames = [...allGroups].sort();

    if (groupNames.length > 0) {
      const headerCells = quantQs.map((q) => `<th>P${escapeHtml(q.question_number)}</th>`).join("");
      const rows = groupNames.map((gName) => {
        const cells = quantQs.map((q) => {
          const gd = (q.by_group as Record<string, QuantResult>)?.[gName];
          const mean = gd?.summary?.mean;
          return `<td style="font-weight:700;color:${mean !== undefined ? getMeanColorHex(mean) : '#94a3b8'}">${mean !== undefined ? mean.toFixed(2) : "—"}</td>`;
        }).join("");
        return `<tr><td><strong>${escapeHtml(gName)}</strong></td>${cells}</tr>`;
      }).join("");

      // Global row
      const globalCells = quantQs.map((q) => `<td style="font-weight:700;color:${getMeanColorHex(q.quantitative!.summary.mean)}">${q.quantitative!.summary.mean.toFixed(2)}</td>`).join("");

      compareTable = `<div class="section"><h2 class="section-title">Comparativa: Grupos x Preguntas</h2><table class="compare-table"><thead><tr><th>Grupo</th>${headerCells}</tr></thead><tbody>${rows}<tr style="border-top:2px solid #cbd5e1;background:#f8fafc"><td><strong>Promedio global</strong></td>${globalCells}</tr></tbody></table></div>`;
    }
  }

  // Build per-question sections
  const chartIds: string[] = [];
  const questionSections = questions.map((q, idx) => {
    const isQuant = q.analysis_type === "quantitative" && q.quantitative;
    const isQual = q.analysis_type === "qualitative" && q.qualitative;
    const chartId = `distChart_${idx}`;
    if (isQuant) chartIds.push(chartId);

    if (!isQuant && !isQual) {
      return `<div class="q-card ${q.analysis_type === "quantitative" ? "quant" : "qual"}"><h3>Pregunta ${escapeHtml(q.question_number)} <span class="q-badge ${q.analysis_type === "quantitative" ? "quant" : "qual"}">${q.analysis_type === "quantitative" ? "Cuantitativa" : "Cualitativa"}</span></h3><p class="q-meta">Sin datos para esta pregunta</p></div>`;
    }

    return `<div class="q-card ${isQuant ? "quant" : "qual"}">
      <h3>Pregunta ${escapeHtml(q.question_number)} <span class="q-badge ${isQuant ? "quant" : "qual"}">${isQuant ? "Cuantitativa" : "Cualitativa"}</span></h3>
      <p class="q-meta">${q.total_responses.toLocaleString()} respuestas</p>
      ${isQuant ? buildQuantSection(q, chartId) : buildQualSection(q)}
    </div>`;
  }).join("");

  // Chart.js scripts for quantitative distribution charts
  const chartScripts = quantQs.map((q, idx) => {
    const dist = q.quantitative!.distribution;
    const values = ["1", "2", "3", "4", "5"].map((v) => dist[v]?.count || 0);
    const chartId = `distChart_${questions.indexOf(q)}`;
    return `new Chart(document.getElementById('${chartId}'),{type:'bar',data:{labels:['1','2','3','4','5'],datasets:[{data:[${values.join(",")}],backgroundColor:${JSON.stringify(DIST_COLORS)},borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});`;
  }).join("\n");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reporte Multi-Pregunta - ${escapeHtml(config.file)}</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4"><\/script><style>${SHARED_CSS}</style></head><body><div class="container">
<div class="header"><h1>Reporte de Evaluaciones Docentes</h1><p>${escapeHtml(config.file)}</p><div class="meta"><span>${now}</span><span>${questions.length} preguntas analizadas</span><span>${quantQs.length} cuantitativas</span><span>${qualQs.length} cualitativas</span><span>${totalResponses.toLocaleString()} respuestas totales</span></div></div>
<div class="cards"><div class="card"><div class="label">Preguntas</div><div class="value">${questions.length}</div></div><div class="card"><div class="label">Cuantitativas</div><div class="value">${quantQs.length}</div></div><div class="card"><div class="label">Cualitativas</div><div class="value">${qualQs.length}</div></div><div class="card"><div class="label">Respuestas</div><div class="value">${totalResponses.toLocaleString()}</div></div></div>
${aiSummary ? `<div class="ai-summary"><h2>Resumen IA</h2>${markdownToHtml(aiSummary)}</div>` : ""}
${quantSummaryTable}
${compareTable}
<div class="section"><h2 class="section-title">Detalle por Pregunta</h2>${questionSections}</div>
<div class="footer">Generado por EvalPlatform &middot; ${now}</div></div>
<script>${chartScripts}<\/script></body></html>`;
}

// ── Unified download ──

export function downloadHtmlReport(data: ExportData) {
  const html = generateHtmlReport(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = data.config.file.replace(/\.[^.]+$/, "") + "_reporte.html";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMultiHtmlReport(data: MultiExportData) {
  const html = generateMultiHtmlReport(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = data.config.file.replace(/\.[^.]+$/, "") + "_reporte_multi.html";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
