"use client";

import { useState, useCallback } from "react";
import FileDropzone from "@/components/upload/file-dropzone";
import ColumnPreview, { type AnalysisConfig } from "@/components/upload/column-preview";
import ExpandableResponse from "@/components/ui/expandable-response";
import { downloadHtmlReport } from "@/lib/export-report";
import { saveReport } from "@/lib/save-report";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-guard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type UploadResult = {
  file_id: string; filename: string; size_mb: number; rows: number;
  columns: { name: string; dtype: string; null_count: number; unique_count: number; unique_values?: string[] }[];
  filepath: string;
};
type WordItem = { word: string; count: number };
type PhraseItem = { phrase: string; count: number };
type NameItem = { name: string; count: number };
type GroupData = {
  summary: { total_responses: number; valid_responses: number; short_responses: number; avg_length: number };
  sentiment: { positivo: number; negativo: number; neutro: number };
  top_words: WordItem[]; top_phrases: PhraseItem[]; top_trigrams: PhraseItem[];
  top_names: NameItem[]; suggestions: string[];
  highlights: { positive: string[]; negative: string[] };
};
type AnalysisResult = {
  general: GroupData;
  by_group: Record<string, GroupData> | null;
  config: { file: string; response_column: string; filters: Record<string, string[]>; group_by: string | null; total_rows_after_filter: number };
};
type DrilldownResult = {
  query: string; total_matches: number;
  sentiment: { positivo: number; negativo: number; neutro: number };
  responses: { text: string; sentiment: string }[];
};

const COLORS = ["#10b981", "#94a3b8", "#ef4444"];

export default function UploadPage() {
  const [step, setStep] = useState<"upload" | "preview" | "analyzing" | "results">("upload");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (result: UploadResult) => { setUploadResult(result); setStep("preview"); };

  const handleContinue = async (config: AnalysisConfig) => {
    setAnalysisConfig(config);
    setStep("analyzing");
    setError(null);
    const deptCol = uploadResult?.columns.find((c) => c.name.toUpperCase() === "DEPARTAMENTO");
    try {
      const res = await fetch(apiUrl("/api/v1/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: config.file_id, response_column: config.responseColumn, filters: config.filters, group_by: deptCol ? "DEPARTAMENTO" : null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Error"); }
      setAnalysisResult(await res.json());
      setStep("results");
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); setStep("preview"); }
  };

  const handleReset = () => { setStep("upload"); setUploadResult(null); setAnalysisConfig(null); setAnalysisResult(null); setError(null); };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{step === "results" ? "Resultados del análisis" : "Subir archivo"}</h1>
        <p className="text-slate-500 mt-1">{step === "results" ? analysisResult?.config.file : "Sube un archivo XLSX o CSV para comenzar el análisis."}</p>
      </div>
      <div className="flex items-center gap-3 mb-8">
        <StepBadge n={1} label="Subir" active={step === "upload"} done={step !== "upload"} />
        <div className="h-px flex-1 bg-slate-200" />
        <StepBadge n={2} label="Configurar" active={step === "preview"} done={step === "analyzing" || step === "results"} />
        <div className="h-px flex-1 bg-slate-200" />
        <StepBadge n={3} label="Resultados" active={step === "analyzing" || step === "results"} done={step === "results"} />
      </div>
      {error && <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">⚠️ {error}</div>}
      {step === "upload" && <FileDropzone onUploadComplete={handleUploadComplete} />}
      {step === "preview" && uploadResult && <ColumnPreview data={uploadResult} onContinue={handleContinue} onReset={handleReset} />}
      {step === "analyzing" && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 animate-pulse"><span className="text-3xl">⚙️</span></div>
          <p className="text-slate-700 font-medium text-lg">Analizando {uploadResult?.rows.toLocaleString()} respuestas...</p>
          <p className="text-slate-400 text-sm mt-1">Sentimiento, n-gramas, nombres y agrupación por departamento</p>
        </div>
      )}
      {step === "results" && analysisResult && analysisConfig && (
        <ResultsDashboard data={analysisResult} config={analysisConfig} onReset={handleReset} />
      )}
    </div>
  );
}

function AISummaryPanel({ fileId, department, label, onSummaryReady }: { fileId: string; department?: string; label: string; onSummaryReady?: (text: string) => void }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/ai-summary"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId, department }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Error"); }
      const data = await res.json();
      setSummary(data.summary);
      if (onSummaryReady) onSummaryReady(data.summary);
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setLoading(false); }
  };

  if (!summary && !loading && !error) {
    return (
      <div className="card p-6 border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><span className="text-xl">🤖</span></div><div><h3 className="font-semibold text-slate-900">Resumen con IA</h3><p className="text-xs text-slate-500">{label}</p></div></div>
        <p className="text-sm text-slate-600 mb-4">La IA generará un reporte con hallazgos, fortalezas y recomendaciones.</p>
        <button onClick={generate} className="btn-primary flex items-center gap-2"><span>✨</span> Generar resumen</button>
      </div>
    );
  }
  if (loading) return (<div className="card p-8 text-center"><div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4 animate-pulse"><span className="text-2xl">🤖</span></div><p className="text-slate-700 font-medium">Generando resumen...</p><p className="text-slate-400 text-sm mt-1">30-90 segundos</p></div>);
  if (error) return (<div className="card p-6 border border-red-200 bg-red-50"><p className="text-sm text-red-700 mb-3">⚠️ {error}</p><button onClick={generate} className="text-sm text-red-600 underline">Reintentar</button></div>);
  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-white text-lg">🤖</span><h3 className="font-semibold text-white">Resumen IA</h3></div><button onClick={generate} className="text-white/80 hover:text-white text-xs">🔄 Regenerar</button></div>
      <div className="p-6"><MarkdownRenderer content={summary || ""} /></div>
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n"); const elements: JSX.Element[] = []; let listItems: string[] = [];
  const flushList = (key: string) => { if (listItems.length > 0) { elements.push(<ul key={key} className="list-disc list-inside space-y-1 mb-4 text-slate-700 text-sm">{listItems.map((item, i) => <li key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />)}</ul>); listItems = []; } };
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("# ")) { flushList("l" + i); elements.push(<h1 key={i} className="text-xl font-bold text-slate-900 mt-6 mb-3">{t.slice(2)}</h1>); }
    else if (t.startsWith("## ")) { flushList("l" + i); elements.push(<h2 key={i} className="text-lg font-semibold text-slate-900 mt-5 mb-2">{t.slice(3)}</h2>); }
    else if (t.startsWith("### ")) { flushList("l" + i); elements.push(<h3 key={i} className="text-base font-semibold text-slate-800 mt-4 mb-2">{t.slice(4)}</h3>); }
    else if (t.startsWith("- ") || t.startsWith("* ")) { listItems.push(fmtInline(t.slice(2))); }
    else if (/^\d+\.\s/.test(t)) { listItems.push(fmtInline(t.replace(/^\d+\.\s/, ""))); }
    else if (t === "") { flushList("l" + i); }
    else { flushList("l" + i); elements.push(<p key={i} className="text-sm text-slate-700 leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: fmtInline(t) }} />); }
  });
  flushList("l-end"); return <div>{elements}</div>;
}
function fmtInline(text: string): string { return text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>').replace(/\*(.+?)\*/g, "<em>$1</em>"); }

function DrilldownModal({ query, fileId, responseColumn, filters, department, onClose }: { query: string; fileId: string; responseColumn: string; filters: Record<string, string[]>; department?: string; onClose: () => void; }) {
  const [data, setData] = useState<DrilldownResult | null>(null);
  const [loading, setLoading] = useState(true);
  useState(() => {
    fetch(apiUrl("/api/v1/drilldown"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId, response_column: responseColumn, query, filters, department, limit: 50 }) }).then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[75vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0"><div><h2 className="font-semibold text-slate-900">Respuestas: &quot;{query}&quot;</h2>{data && <p className="text-sm text-slate-500 mt-0.5">{data.total_matches} encontradas{department ? " en " + department : ""}</p>}</div><button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button></div>
        {data && !loading && (<div className="px-5 py-3 border-b border-slate-100 flex gap-4 flex-shrink-0"><MiniSent label="Positivo" count={data.sentiment.positivo} total={data.total_matches} color="text-emerald-600" /><MiniSent label="Neutro" count={data.sentiment.neutro} total={data.total_matches} color="text-slate-500" /><MiniSent label="Negativo" count={data.sentiment.negativo} total={data.total_matches} color="text-red-600" /></div>)}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">{loading && <p className="text-center text-slate-400 py-8">Buscando...</p>}{data?.responses.map((r, i) => <ExpandableResponse key={i} text={r.text} variant={r.sentiment === "positivo" ? "positive" : r.sentiment === "negativo" ? "negative" : "neutral"} previewLength={400} />)}{data && data.responses.length === 0 && <p className="text-center text-slate-400 py-8">No se encontraron</p>}</div>
      </div>
    </div>
  );
}
function MiniSent({ label, count, total, color }: { label: string; count: number; total: number; color: string }) { const pct = total > 0 ? Math.round((count / total) * 100) : 0; return <div className="text-sm"><span className="text-slate-500">{label}: </span><span className={"font-medium " + color}>{pct}% ({count})</span></div>; }

function ResultsDashboard({ data, config, onReset }: { data: AnalysisResult; config: AnalysisConfig; onReset: () => void }) {
  const { general, by_group } = data;
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<"general" | "departments" | "compare" | "ai">("general");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<{ query: string; department?: string } | null>(null);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const deptNames = by_group ? Object.keys(by_group).sort() : [];
  const onDrilldown = useCallback((query: string, department?: string) => { setDrilldown({ query, department }); }, []);

  const handleSave = async () => {
    setSaving(true);
    const title = data.config.file + " — " + new Date().toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" });
    const result = await saveReport({ title, config: data.config, results: { general, by_group }, aiSummary: aiSummaryText });
    setSaving(false);
    if (result.success) setSaved(true);
    else alert("Error: " + result.error);
  };

  const sentimentPie = [{ name: "Positivo", value: general.sentiment.positivo }, { name: "Neutro", value: general.sentiment.neutro }, { name: "Negativo", value: general.sentiment.negativo }];
  const wordChartData = general.top_words.slice(0, 12).map((w) => ({ name: w.word, cantidad: w.count }));
  const deptCompareData = deptNames.map((name) => { const d = by_group![name]; const t = d.summary.valid_responses || 1; return { name, positivo: Math.round((d.sentiment.positivo / t) * 100), neutro: Math.round((d.sentiment.neutro / t) * 100), negativo: Math.round((d.sentiment.negativo / t) * 100), respuestas: d.summary.valid_responses }; }).sort((a, b) => b.positivo - a.positivo);
  const tabs = ["general", ...(by_group ? ["departments", "compare"] : []), ...(isAdmin ? ["ai"] : [])];

  return (
    <div className="space-y-6">
      {drilldown && <DrilldownModal query={drilldown.query} fileId={config.file_id} responseColumn={config.responseColumn} filters={config.filters} department={drilldown.department} onClose={() => setDrilldown(null)} />}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Total respuestas" value={general.summary.total_responses.toLocaleString()} icon="📊" />
        <MetricCard label="Válidas" value={general.summary.valid_responses.toLocaleString()} icon="✅" />
        <MetricCard label="Long. promedio" value={Math.round(general.summary.avg_length) + " chars"} icon="📏" />
        <MetricCard label="Sugerencias" value={general.suggestions.length.toString()} icon="💡" />
        <MetricCard label="Departamentos" value={deptNames.length.toString()} icon="🏢" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-4">Distribución de sentimiento</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={sentimentPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => name + " " + (percent * 100).toFixed(0) + "%"}>{sentimentPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-4">Palabras más frecuentes</h3><ResponsiveContainer width="100%" height={250}><BarChart data={wordChartData} layout="vertical" margin={{ left: 60 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={55} /><Tooltip /><Bar dataKey="cantidad" fill="#3b82f6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (<button key={t} onClick={() => setTab(t as any)} className={"px-4 py-2 text-sm font-medium rounded-md transition-colors " + (tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{t === "general" ? "📋 General" : t === "departments" ? "🏢 Por departamento" : t === "compare" ? "📊 Comparativa" : "🤖 Resumen IA"}</button>))}
      </div>

      {tab === "general" && (<>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-1">Bigramas</h3><p className="text-xs text-slate-400 mb-3">Clic para ver respuestas</p><div className="space-y-1.5">{general.top_phrases.slice(0, 12).map((item, i) => <ClickableBar key={i} label={item.phrase} count={item.count} max={general.top_phrases[0]?.count || 1} onClick={() => onDrilldown(item.phrase)} />)}</div></div>
          <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-1">Trigramas</h3><p className="text-xs text-slate-400 mb-3">Clic para ver respuestas</p><div className="space-y-1.5">{general.top_trigrams.slice(0, 12).map((item, i) => <ClickableBar key={i} label={item.phrase} count={item.count} max={general.top_trigrams[0]?.count || 1} onClick={() => onDrilldown(item.phrase)} />)}</div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {general.top_names.length > 0 && (<div className="card p-5"><h3 className="font-semibold text-slate-900 mb-1">👤 Nombres</h3><p className="text-xs text-slate-400 mb-3">Clic para ver contexto</p><div className="space-y-1.5">{general.top_names.slice(0, 15).map((item, i) => <ClickableBar key={i} label={item.name} count={item.count} max={general.top_names[0]?.count || 1} onClick={() => onDrilldown(item.name)} color="bg-purple-500" />)}</div></div>)}
          <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-3">Nube de palabras</h3><div className="flex flex-wrap gap-2">{general.top_words.slice(0, 25).map((w, i) => { const maxC = general.top_words[0]?.count || 1; const intensity = Math.max(0.3, w.count / maxC); return (<button key={i} onClick={() => onDrilldown(w.word)} className="px-3 py-1.5 rounded-full text-sm font-medium border transition-transform hover:scale-105 cursor-pointer" style={{ backgroundColor: "rgba(59,130,246," + (intensity * 0.2) + ")", borderColor: "rgba(59,130,246," + (intensity * 0.5) + ")", color: "rgba(30,64,175," + Math.max(0.6, intensity) + ")" }}>{w.word} <span className="opacity-60">({w.count})</span></button>); })}</div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HighlightsSection title="✨ Positivas" subtitle="Mayor contenido positivo" items={general.highlights.positive} variant="positive" />
          <HighlightsSection title="⚠️ Áreas de oportunidad" subtitle="Contenido negativo" items={general.highlights.negative} variant="negative" />
        </div>
        {general.suggestions.length > 0 && <HighlightsSection title="💡 Sugerencias" subtitle={general.suggestions.length + " encontradas"} items={general.suggestions} variant="suggestion" />}
      </>)}

      {tab === "compare" && by_group && (<div className="space-y-6">
        <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-2">Sentimiento por departamento</h3><ResponsiveContainer width="100%" height={Math.max(350, deptCompareData.length * 40)}><BarChart data={deptCompareData} layout="vertical" margin={{ left: 50 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" /><YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={45} /><Tooltip formatter={(v: number) => v + "%"} /><Legend /><Bar dataKey="positivo" stackId="a" fill="#10b981" name="Positivo" /><Bar dataKey="neutro" stackId="a" fill="#94a3b8" name="Neutro" /><Bar dataKey="negativo" stackId="a" fill="#ef4444" name="Negativo" /></BarChart></ResponsiveContainer></div>
        <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-2">Volumen</h3><ResponsiveContainer width="100%" height={Math.max(350, deptCompareData.length * 40)}><BarChart data={[...deptCompareData].sort((a, b) => b.respuestas - a.respuestas)} layout="vertical" margin={{ left: 50 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={45} /><Tooltip /><Bar dataKey="respuestas" fill="#6366f1" radius={[0, 4, 4, 0]} name="Respuestas" /></BarChart></ResponsiveContainer></div>
        <div className="card p-5"><h3 className="font-semibold text-slate-900 mb-4">Ranking</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200"><th className="text-left py-2 px-3 text-slate-500 font-medium">#</th><th className="text-left py-2 px-3 text-slate-500 font-medium">Departamento</th><th className="text-right py-2 px-3 text-slate-500 font-medium">Resp.</th><th className="text-right py-2 px-3 text-slate-500 font-medium">% Pos</th><th className="text-right py-2 px-3 text-slate-500 font-medium">% Neg</th><th className="text-right py-2 px-3 text-slate-500 font-medium">Suger.</th></tr></thead><tbody>{deptCompareData.map((dept, i) => (<tr key={dept.name} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedDept(dept.name); setTab("departments"); }}><td className="py-2.5 px-3 text-slate-400">{i + 1}</td><td className="py-2.5 px-3 font-medium text-slate-900">{dept.name}</td><td className="py-2.5 px-3 text-right text-slate-600">{dept.respuestas.toLocaleString()}</td><td className="py-2.5 px-3 text-right"><span className={"font-medium " + (dept.positivo >= 50 ? "text-emerald-600" : "text-slate-600")}>{dept.positivo}%</span></td><td className="py-2.5 px-3 text-right"><span className={"font-medium " + (dept.negativo >= 20 ? "text-red-600" : "text-slate-600")}>{dept.negativo}%</span></td><td className="py-2.5 px-3 text-right text-slate-600">{by_group[dept.name]?.suggestions.length || 0}</td></tr>))}</tbody></table></div></div>
      </div>)}

      {tab === "departments" && by_group && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-4 md:col-span-1 h-fit sticky top-8"><h3 className="font-semibold text-slate-900 mb-3 text-sm">Departamentos</h3><div className="space-y-1 max-h-[600px] overflow-y-auto">{deptNames.map((name) => { const d = by_group[name]; const t2 = d.summary.valid_responses || 1; const pp = Math.round((d.sentiment.positivo / t2) * 100); return (<button key={name} onClick={() => setSelectedDept(name)} className={"w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors " + (selectedDept === name ? "bg-blue-100 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-100")}><div className="flex justify-between items-center"><span className="truncate">{name}</span><div className="flex items-center gap-2 flex-shrink-0"><span className="text-xs text-slate-400">{d.summary.valid_responses}</span><div className="w-8 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: pp + "%" }} /></div></div></div></button>); })}</div></div>
          <div className="md:col-span-3">{selectedDept && by_group[selectedDept] ? <DepartmentDetail name={selectedDept} data={by_group[selectedDept]} onDrilldown={onDrilldown} fileId={config.file_id} /> : <div className="card p-12 text-center text-slate-400"><span className="text-4xl block mb-3">🏢</span><p className="font-medium text-slate-600">Selecciona un departamento</p></div>}</div>
        </div>
      )}

      {tab === "ai" && isAdmin && (<div className="space-y-6">
        <AISummaryPanel fileId={config.file_id} label="Resumen ejecutivo" onSummaryReady={setAiSummaryText} />
        {by_group && deptNames.length > 0 && (<div className="card p-5"><h3 className="font-semibold text-slate-900 mb-1">Por departamento</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">{deptNames.map((name) => <DeptAICard key={name} name={name} fileId={config.file_id} data={by_group[name]} />)}</div></div>)}
      </div>)}

      <div className="flex justify-end gap-3 pt-4">
        <button onClick={handleSave} disabled={saving || saved} className={"flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors " + (saved ? "bg-emerald-100 text-emerald-700" : "btn-secondary")}>{saved ? "✅ Guardado" : saving ? "Guardando..." : "💾 Guardar reporte"}</button>
        <button onClick={() => downloadHtmlReport({ general, by_group, config: data.config, aiSummary: aiSummaryText || undefined })} className="btn-secondary flex items-center gap-2">📥 Exportar HTML</button>
        <button onClick={onReset} className="btn-secondary">Nuevo análisis</button>
      </div>
    </div>
  );
}

function DeptAICard({ name, fileId, data }: { name: string; fileId: string; data: GroupData }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const t = data.summary.valid_responses || 1;
  const pp = Math.round((data.sentiment.positivo / t) * 100);
  const np = Math.round((data.sentiment.negativo / t) * 100);
  const generate = async () => { setLoading(true); try { const res = await fetch(apiUrl("/api/v1/ai-summary"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file_id: fileId, department: name }) }); if (!res.ok) { const err = await res.json(); throw new Error(err.detail); } const d = await res.json(); setSummary(d.summary); setExpanded(true); } catch (err) { alert(err instanceof Error ? err.message : "Error"); } finally { setLoading(false); } };
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between"><div><p className="font-medium text-slate-900 text-sm">{name}</p><p className="text-xs text-slate-500">{data.summary.valid_responses} resp · <span className="text-emerald-600">{pp}%+</span> <span className="text-red-600">{np}%-</span></p></div>
        {!summary ? <button onClick={generate} disabled={loading} className={"text-xs font-medium px-3 py-1.5 rounded-lg transition-colors " + (loading ? "bg-slate-100 text-slate-400" : "bg-purple-100 text-purple-700 hover:bg-purple-200")}>{loading ? "Generando..." : "🤖 Generar"}</button> : <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 font-medium">{expanded ? "▲ Ocultar" : "▼ Ver"}</button>}
      </div>
      {expanded && summary && <div className="border-t border-slate-200 p-4 bg-slate-50"><MarkdownRenderer content={summary} /></div>}
    </div>
  );
}

function DepartmentDetail({ name, data, onDrilldown, fileId }: { name: string; data: GroupData; onDrilldown: (q: string, dept?: string) => void; fileId: string }) {
  const { isAdmin } = useAuth();
  const total = data.summary.valid_responses || 1;
  const sentPie = [{ name: "Positivo", value: data.sentiment.positivo }, { name: "Neutro", value: data.sentiment.neutro }, { name: "Negativo", value: data.sentiment.negativo }];
  const wd = data.top_words.slice(0, 10).map((w) => ({ name: w.word, cantidad: w.count }));
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">🏢</div><div><h3 className="font-semibold text-slate-900 text-lg">{name}</h3><p className="text-sm text-slate-500">{data.summary.valid_responses.toLocaleString()} respuestas · Long. prom: {Math.round(data.summary.avg_length)} chars</p></div></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{Math.round((data.sentiment.positivo / total) * 100)}%</p><p className="text-xs text-emerald-700 mt-0.5">Positivo</p></div>
          <div className="bg-slate-100 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-slate-600">{Math.round((data.sentiment.neutro / total) * 100)}%</p><p className="text-xs text-slate-600 mt-0.5">Neutro</p></div>
          <div className="bg-red-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-red-600">{Math.round((data.sentiment.negativo / total) * 100)}%</p><p className="text-xs text-red-700 mt-0.5">Negativo</p></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5"><h4 className="font-medium text-slate-900 mb-3 text-sm">Sentimiento</h4><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={sentPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ percent }) => (percent * 100).toFixed(0) + "%"}>{sentPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        <div className="card p-5"><h4 className="font-medium text-slate-900 mb-3 text-sm">Top palabras</h4><ResponsiveContainer width="100%" height={180}><BarChart data={wd} layout="vertical" margin={{ left: 50 }}><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={48} /><Tooltip /><Bar dataKey="cantidad" fill="#6366f1" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5"><h4 className="font-medium text-slate-900 mb-1 text-sm">Bigramas</h4><div className="space-y-1.5">{data.top_phrases.slice(0, 8).map((item, i) => <ClickableBar key={i} label={item.phrase} count={item.count} max={data.top_phrases[0]?.count || 1} onClick={() => onDrilldown(item.phrase, name)} />)}</div></div>
        <div className="card p-5"><h4 className="font-medium text-slate-900 mb-1 text-sm">Trigramas</h4><div className="space-y-1.5">{data.top_trigrams.slice(0, 8).map((item, i) => <ClickableBar key={i} label={item.phrase} count={item.count} max={data.top_trigrams[0]?.count || 1} onClick={() => onDrilldown(item.phrase, name)} />)}</div></div>
      </div>
      {data.top_names.length > 0 && <div className="card p-5"><h4 className="font-medium text-slate-900 mb-1 text-sm">👤 Nombres</h4><div className="flex flex-wrap gap-2">{data.top_names.slice(0, 15).map((item, i) => <button key={i} onClick={() => onDrilldown(item.name, name)} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200 hover:bg-purple-100 cursor-pointer">{item.name} ({item.count})</button>)}</div></div>}
      {isAdmin && <AISummaryPanel fileId={fileId} department={name} label={"Reporte IA: " + name} />}
      {data.highlights.positive.length > 0 && <HighlightsSection title="✨ Destacadas" subtitle="Positivas" items={data.highlights.positive.slice(0, 8)} variant="positive" />}
      {data.highlights.negative.length > 0 && <HighlightsSection title="⚠️ Oportunidad" subtitle="Críticas" items={data.highlights.negative.slice(0, 8)} variant="negative" />}
      {data.suggestions.length > 0 && <HighlightsSection title={"💡 Sugerencias (" + data.suggestions.length + ")"} subtitle="Mejoras" items={data.suggestions.slice(0, 8)} variant="suggestion" />}
    </div>
  );
}

function HighlightsSection({ title, subtitle, items, variant }: { title: string; subtitle: string; items: string[]; variant: "positive" | "negative" | "suggestion" }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 3);
  return (<div className="card p-5"><h3 className="font-semibold text-slate-900 mb-0.5">{title}</h3><p className="text-xs text-slate-400 mb-3">{subtitle}</p><div className="space-y-2">{visible.map((resp, i) => <ExpandableResponse key={i} text={resp} variant={variant} />)}{items.length === 0 && <p className="text-sm text-slate-400 italic">No se encontraron</p>}</div>{items.length > 3 && <button onClick={() => setShowAll(!showAll)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">{showAll ? "▲ Menos" : "▼ Todas (" + items.length + ")"}</button>}</div>);
}
function ClickableBar({ label, count, max, onClick, color = "bg-blue-500" }: { label: string; count: number; max: number; onClick: () => void; color?: string }) { const pct = max > 0 ? Math.round((count / max) * 100) : 0; return (<button onClick={onClick} className="flex items-center gap-3 w-full group hover:bg-slate-50 rounded px-1 py-0.5 -mx-1 transition-colors"><span className="text-sm text-slate-700 w-36 truncate text-left group-hover:text-blue-600">{label}</span><div className="flex-1 bg-slate-100 rounded-full h-2"><div className={color + " h-2 rounded-full"} style={{ width: pct + "%" }} /></div><span className="text-xs text-slate-500 w-10 text-right">{count}</span></button>); }
function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) { return (<div className="card p-4"><div className="flex items-center gap-2 mb-1"><span className="text-base">{icon}</span><p className="text-xs font-medium text-slate-500">{label}</p></div><p className="text-xl font-bold text-slate-900">{value}</p></div>); }
function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) { return (<div className="flex items-center gap-2"><div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold " + (done ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500")}>{done ? "✓" : n}</div><span className={"text-sm font-medium " + (active || done ? "text-slate-900" : "text-slate-400")}>{label}</span></div>); }