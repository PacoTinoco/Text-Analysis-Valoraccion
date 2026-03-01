"use client";

import { useState, useEffect } from "react";
import { supabase, type SavedReport } from "@/lib/supabase";
import { useAuth } from "@/components/auth/auth-guard";
import { downloadHtmlReport } from "@/lib/export-report";

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadReports();
  }, [user]);

  const loadReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setReports(data);
    setLoading(false);
  };

  const deleteReport = async (id: string) => {
    if (!confirm("¿Eliminar este reporte? Esta acción no se puede deshacer.")) return;
    await supabase.from("reports").delete().eq("id", id);
    setReports(reports.filter((r) => r.id !== id));
  };

  const isNewFormat = (report: SavedReport) => {
    return Array.isArray(report.results?.questions);
  };

  const exportReport = (report: SavedReport) => {
    if (isNewFormat(report)) {
      // New multi-analyze format — export not yet supported
      alert("La exportación HTML para reportes multi-pregunta estará disponible próximamente. Puedes ver los datos del reporte aquí.");
      return;
    }
    downloadHtmlReport({
      general: report.results.general,
      by_group: report.results.by_group,
      config: report.config,
      aiSummary: report.ai_summary || undefined,
    });
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reportes</h1>
        <p className="text-slate-500 mb-8">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-slate-500 mt-1">Historial de análisis guardados.</p>
      </div>

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="text-4xl block mb-3">📋</span>
          <p className="font-medium text-slate-600">No tienes reportes guardados</p>
          <p className="text-sm text-slate-400 mt-1">Sube un archivo y ejecuta un análisis para guardar tu primer reporte.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isNew = isNewFormat(report);
            // Extract metrics depending on format
            let total = 0;
            let posPct = 0;
            let deptCount = 0;
            let sugCount = 0;
            let quantCount = 0;
            let qualCount = 0;

            if (isNew) {
              const questions = report.results?.questions || [];
              quantCount = questions.filter((q: any) => q.analysis_type === "quantitative").length;
              qualCount = questions.filter((q: any) => q.analysis_type === "qualitative").length;
              total = questions.reduce((sum: number, q: any) => sum + (q.total_responses || 0), 0);
              // For qualitative questions, compute aggregate sentiment
              const qualQs = questions.filter((q: any) => q.qualitative);
              if (qualQs.length > 0) {
                const totalSent = qualQs.reduce((sum: number, q: any) => sum + (q.qualitative?.summary?.valid_responses || 0), 0);
                const totalPos = qualQs.reduce((sum: number, q: any) => sum + (q.qualitative?.sentiment?.positivo || 0), 0);
                posPct = totalSent > 0 ? Math.round((totalPos / totalSent) * 100) : 0;
                sugCount = qualQs.reduce((sum: number, q: any) => sum + (q.qualitative?.suggestions?.length || 0), 0);
              }
              // For quantitative, show average mean
              const quantQs = questions.filter((q: any) => q.quantitative);
              // Count groups from first question that has by_group
              const withGroups = questions.find((q: any) => q.by_group && typeof q.by_group === "object");
              deptCount = withGroups ? Object.keys(withGroups.by_group).length : 0;
            } else {
              const general = report.results?.general;
              deptCount = report.results?.by_group ? Object.keys(report.results.by_group).length : 0;
              total = general?.summary?.valid_responses || 0;
              const sent = general?.sentiment || {};
              posPct = total > 0 ? Math.round(((sent.positivo || 0) / total) * 100) : 0;
              sugCount = general?.suggestions?.length || 0;
            }

            const isExpanded = expandedId === report.id;
            const date = new Date(report.created_at).toLocaleDateString("es-MX", {
              year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            });

            return (
              <div key={report.id} className="card overflow-hidden">
                <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{report.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{date} · {report.config?.file || "Archivo"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium text-slate-900">{total.toLocaleString()} respuestas</p>
                      <p className="text-xs text-slate-500">
                        {isNew ? (
                          <span>{quantCount} cuant. · {qualCount} cual.</span>
                        ) : (
                          <span className="text-emerald-600">{posPct}% pos</span>
                        )}
                        {deptCount > 0 && <span> · {deptCount} grupos</span>}
                      </p>
                    </div>
                    <span className={"text-slate-400 transition-transform " + (isExpanded ? "rotate-180" : "")}>▼</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <MiniStat label="Respuestas" value={total.toLocaleString()} />
                      {isNew ? (
                        <>
                          <MiniStat label="Cuantitativas" value={quantCount.toString()} />
                          <MiniStat label="Cualitativas" value={qualCount.toString()} />
                        </>
                      ) : (
                        <>
                          <MiniStat label="Positivo" value={posPct + "%"} />
                          <MiniStat label="Sugerencias" value={sugCount.toString()} />
                        </>
                      )}
                      <MiniStat label="Grupos" value={deptCount.toString()} />
                    </div>

                    {report.ai_summary && (
                      <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs font-medium text-purple-700 mb-1">🤖 Resumen IA incluido</p>
                        <p className="text-xs text-purple-600 line-clamp-2">{report.ai_summary.slice(0, 200)}...</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => exportReport(report)}
                        className="btn-secondary text-sm flex items-center gap-1">
                        📥 Exportar HTML
                      </button>
                      <button onClick={() => deleteReport(report.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}