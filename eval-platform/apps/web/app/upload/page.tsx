"use client";

import { useState } from "react";
import FileDropzone from "@/components/upload/file-dropzone";
import ColumnPreview, {
  type AnalysisConfig,
} from "@/components/upload/column-preview";

type UploadResult = {
  file_id: string;
  filename: string;
  size_mb: number;
  rows: number;
  columns: {
    name: string;
    dtype: string;
    null_count: number;
    unique_count: number;
    unique_values?: string[];
  }[];
  filepath: string;
};

type WordItem = { word: string; count: number };
type PhraseItem = { phrase: string; count: number };

type AnalysisResult = {
  general: {
    summary: {
      total_responses: number;
      valid_responses: number;
      short_responses: number;
      avg_length: number;
    };
    sentiment: { positivo: number; negativo: number; neutro: number };
    top_words: WordItem[];
    top_phrases: PhraseItem[];
    suggestions: string[];
    highlights: { positive: string[]; negative: string[] };
  };
  by_group: Record<string, {
    summary: { total_responses: number; valid_responses: number; short_responses: number; avg_length: number };
    sentiment: { positivo: number; negativo: number; neutro: number };
    top_words: WordItem[];
    suggestions: string[];
    highlights: { positive: string[]; negative: string[] };
  }> | null;
  config: {
    file: string;
    response_column: string;
    filters: Record<string, string[]>;
    group_by: string | null;
    total_rows_after_filter: number;
  };
};

export default function UploadPage() {
  const [step, setStep] = useState<"upload" | "preview" | "analyzing" | "results">("upload");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (result: UploadResult) => {
    setUploadResult(result);
    setStep("preview");
  };

  const handleContinue = async (config: AnalysisConfig) => {
    setAnalysisConfig(config);
    setStep("analyzing");
    setError(null);

    // Buscar si hay una columna de departamento para agrupar
    const deptCol = uploadResult?.columns.find(
      (c) => c.name.toUpperCase() === "DEPARTAMENTO"
    );

    try {
      const res = await fetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: config.file_id,
          response_column: config.responseColumn,
          filters: config.filters,
          group_by: deptCol ? "DEPARTAMENTO" : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error en el análisis");
      }

      const data = await res.json();
      setAnalysisResult(data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setUploadResult(null);
    setAnalysisConfig(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {step === "results" ? "Resultados del análisis" : "Subir archivo"}
        </h1>
        <p className="text-slate-500 mt-1">
          {step === "results"
            ? analysisConfig?.filename
            : "Sube un archivo XLSX o CSV para comenzar el análisis."}
        </p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        <StepBadge number={1} label="Subir" active={step === "upload"} done={step !== "upload"} />
        <div className="h-px flex-1 bg-slate-200" />
        <StepBadge number={2} label="Configurar" active={step === "preview"} done={step === "analyzing" || step === "results"} />
        <div className="h-px flex-1 bg-slate-200" />
        <StepBadge number={3} label="Resultados" active={step === "analyzing" || step === "results"} done={step === "results"} />
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {step === "upload" && <FileDropzone onUploadComplete={handleUploadComplete} />}

      {step === "preview" && uploadResult && (
        <ColumnPreview data={uploadResult} onContinue={handleContinue} onReset={handleReset} />
      )}

      {step === "analyzing" && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-3xl">⚙️</span>
          </div>
          <p className="text-slate-700 font-medium text-lg">Analizando respuestas...</p>
          <p className="text-slate-400 text-sm mt-1">Esto puede tomar unos segundos</p>
        </div>
      )}

      {step === "results" && analysisResult && (
        <ResultsDashboard data={analysisResult} onReset={handleReset} />
      )}
    </div>
  );
}

/* ===================== RESULTS DASHBOARD ===================== */

function ResultsDashboard({ data, onReset }: { data: AnalysisResult; onReset: () => void }) {
  const { general, by_group, config } = data;
  const [activeTab, setActiveTab] = useState<"general" | "departments">("general");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const deptNames = by_group ? Object.keys(by_group) : [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total respuestas" value={general.summary.total_responses.toLocaleString()} />
        <MetricCard label="Respuestas válidas" value={general.summary.valid_responses.toLocaleString()} />
        <MetricCard label="Longitud promedio" value={general.summary.avg_length + " chars"} />
        <MetricCard label="Respuestas cortas" value={general.summary.short_responses.toLocaleString()} />
      </div>

      {/* Sentiment */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Sentimiento general</h3>
        <div className="flex gap-4 mb-3">
          <SentimentBar label="Positivo" count={general.sentiment.positivo} total={general.summary.valid_responses} color="bg-emerald-500" />
          <SentimentBar label="Neutro" count={general.sentiment.neutro} total={general.summary.valid_responses} color="bg-slate-400" />
          <SentimentBar label="Negativo" count={general.sentiment.negativo} total={general.summary.valid_responses} color="bg-red-500" />
        </div>
      </div>

      {/* Tabs */}
      {by_group && (
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("general")}
            className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors "
              + (activeTab === "general" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Vista general
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors "
              + (activeTab === "departments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
          >
            Por departamento ({deptNames.length})
          </button>
        </div>
      )}

      {activeTab === "general" && (
        <>
          {/* Top words */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Palabras más frecuentes</h3>
              <div className="space-y-2">
                {general.top_words.slice(0, 15).map((item, i) => (
                  <WordBar key={i} label={item.word} count={item.count} max={general.top_words[0].count} />
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Frases más frecuentes</h3>
              <div className="space-y-2">
                {general.top_phrases.slice(0, 15).map((item, i) => (
                  <WordBar key={i} label={item.phrase} count={item.count} max={general.top_phrases[0].count} />
                ))}
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-1">✨ Respuestas destacadas positivas</h3>
              <p className="text-xs text-slate-400 mb-3">Respuestas con mayor contenido positivo</p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {general.highlights.positive.slice(0, 5).map((resp, i) => (
                  <div key={i} className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-slate-700">
                    {resp.length > 300 ? resp.slice(0, 300) + "..." : resp}
                  </div>
                ))}
                {general.highlights.positive.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No se encontraron respuestas destacadas</p>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-1">⚠️ Áreas de oportunidad</h3>
              <p className="text-xs text-slate-400 mb-3">Respuestas con contenido negativo o crítico</p>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {general.highlights.negative.slice(0, 5).map((resp, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-slate-700">
                    {resp.length > 300 ? resp.slice(0, 300) + "..." : resp}
                  </div>
                ))}
                {general.highlights.negative.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No se encontraron respuestas negativas</p>
                )}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {general.suggestions.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 mb-1">💡 Sugerencias detectadas</h3>
              <p className="text-xs text-slate-400 mb-3">
                Respuestas que contienen sugerencias o peticiones ({general.suggestions.length} encontradas)
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {general.suggestions.slice(0, 10).map((resp, i) => (
                  <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-slate-700">
                    {resp.length > 300 ? resp.slice(0, 300) + "..." : resp}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "departments" && by_group && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Department list */}
          <div className="card p-4 md:col-span-1">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm">Departamentos</h3>
            <div className="space-y-1">
              {deptNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedDept(name)}
                  className={"w-full text-left px-3 py-2 rounded-lg text-sm transition-colors "
                    + (selectedDept === name
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100")}
                >
                  <div className="flex justify-between items-center">
                    <span>{name}</span>
                    <span className="text-xs text-slate-400">
                      {by_group[name].summary.valid_responses}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Department detail */}
          <div className="md:col-span-3">
            {selectedDept && by_group[selectedDept] ? (
              <DepartmentDetail name={selectedDept} data={by_group[selectedDept]} />
            ) : (
              <div className="card p-12 text-center text-slate-400">
                <p className="text-lg mb-1">←</p>
                <p className="text-sm">Selecciona un departamento para ver su análisis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button onClick={onReset} className="btn-secondary">
          Nuevo análisis
        </button>
      </div>
    </div>
  );
}

/* ===================== DEPARTMENT DETAIL ===================== */

function DepartmentDetail({ name, data }: { name: string; data: any }) {
  const total = data.summary.valid_responses;
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 text-lg mb-4">Departamento: {name}</h3>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <MetricCard label="Respuestas" value={data.summary.valid_responses.toLocaleString()} />
          <MetricCard label="Long. promedio" value={data.summary.avg_length + ""} />
          <MetricCard label="Cortas" value={data.summary.short_responses.toLocaleString()} />
        </div>

        <div className="flex gap-4 mb-4">
          <SentimentBar label="Positivo" count={data.sentiment.positivo} total={total} color="bg-emerald-500" />
          <SentimentBar label="Neutro" count={data.sentiment.neutro} total={total} color="bg-slate-400" />
          <SentimentBar label="Negativo" count={data.sentiment.negativo} total={total} color="bg-red-500" />
        </div>
      </div>

      {/* Top words for this dept */}
      <div className="card p-5">
        <h4 className="font-medium text-slate-900 mb-3">Palabras clave</h4>
        <div className="flex flex-wrap gap-2">
          {data.top_words.slice(0, 20).map((item: WordItem, i: number) => (
            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
              {item.word} <span className="text-slate-400">({item.count})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Highlights */}
      {data.highlights.positive.length > 0 && (
        <div className="card p-5">
          <h4 className="font-medium text-slate-900 mb-3">✨ Destacadas</h4>
          <div className="space-y-2">
            {data.highlights.positive.slice(0, 3).map((r: string, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-slate-700">
                {r.length > 250 ? r.slice(0, 250) + "..." : r}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.highlights.negative.length > 0 && (
        <div className="card p-5">
          <h4 className="font-medium text-slate-900 mb-3">⚠️ Áreas de oportunidad</h4>
          <div className="space-y-2">
            {data.highlights.negative.slice(0, 3).map((r: string, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-slate-700">
                {r.length > 250 ? r.slice(0, 250) + "..." : r}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.suggestions.length > 0 && (
        <div className="card p-5">
          <h4 className="font-medium text-slate-900 mb-3">💡 Sugerencias ({data.suggestions.length})</h4>
          <div className="space-y-2">
            {data.suggestions.slice(0, 3).map((r: string, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-slate-700">
                {r.length > 250 ? r.slice(0, 250) + "..." : r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== REUSABLE COMPONENTS ===================== */

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-500">{pct}% ({count.toLocaleString()})</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div className={color + " h-2 rounded-full transition-all"} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

function WordBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-700 w-32 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full" style={{ width: pct + "%" }} />
      </div>
      <span className="text-xs text-slate-500 w-10 text-right">{count}</span>
    </div>
  );
}

function StepBadge({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold "
        + (done ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500")}>
        {done ? "✓" : number}
      </div>
      <span className={"text-sm font-medium " + (active ? "text-slate-900" : "text-slate-400")}>
        {label}
      </span>
    </div>
  );
}