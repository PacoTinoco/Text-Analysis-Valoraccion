"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-guard";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAnalysisStore } from "@/contexts/analysis-store";

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const { analyses } = useAnalysisStore();
  const [reportCount, setReportCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setReportCount(count || 0))
      .catch(() => setReportCount(0));
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || "Usuario";
  const fullName = profile?.full_name || "Usuario";
  const email = profile?.email || "";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateStr = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Hero greeting ── */}
      <div className="mb-10">
        <p className="text-sm font-medium text-blue-600 mb-1 capitalize tracking-wide">
          {greeting}
        </p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {firstName}
          <span className="text-blue-600">.</span>
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm">{dateStr}</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Reports */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            {reportCount !== null && reportCount > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                Activos
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {reportCount === null ? (
              <span className="inline-block w-8 h-8 bg-slate-100 rounded animate-pulse" />
            ) : (
              reportCount
            )}
          </p>
          <p className="text-sm text-slate-500 mt-1">Reportes guardados</p>
          {/* Decorative mini bar chart */}
          <div className="flex items-end gap-1 mt-4 h-6 opacity-40">
            {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-blue-400 rounded-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* User */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <span className={
              "text-xs font-semibold px-2 py-0.5 rounded-full " +
              (isAdmin
                ? "bg-purple-50 text-purple-600"
                : "bg-emerald-50 text-emerald-600")
            }>
              {isAdmin ? "Admin" : "Usuario"}
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 truncate">{fullName}</p>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{email}</p>
          {/* Decorative avatar ring */}
          <div className="flex items-center gap-2 mt-4">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: "100%" }} />
            </div>
            <span className="text-xs text-emerald-600 font-medium">Activo</span>
          </div>
        </div>

        {/* Platform */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5M12 12.75l3 1.5M12 12.75V18" />
              </svg>
            </div>
            <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2 py-0.5 rounded-full">
              v1.0
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900">EvalPlatform</p>
          <p className="text-sm text-slate-500 mt-0.5">Análisis docente ITESO</p>
          {/* Decorative dots */}
          <div className="flex items-center gap-2 mt-4">
            {["bg-violet-400", "bg-blue-400", "bg-emerald-400"].map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${c}`} />
                <span className="text-xs text-slate-400">{["Cuanti.", "Cuali.", "IA"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent analyses (in-session) ── */}
      {analyses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            Análisis recientes
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {analyses.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analyses.map((a) => {
              const qCount = a.result?.questions?.length ?? 0;
              const time = new Date(a.timestamp).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <Link
                  key={a.id}
                  href={`/upload?restore=${a.id}`}
                  className="group bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/80 p-4
                             hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow shadow-blue-500/15 flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {qCount} pregunta{qCount !== 1 ? "s" : ""} · {time}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick start — minimal, clean ── */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/upload"
            className="group flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white/60 p-4
                       hover:border-blue-300 hover:bg-blue-50/40 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow shadow-orange-500/15 group-hover:scale-105 transition-transform flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                Subir archivo
              </p>
              <p className="text-xs text-slate-400">XLSX o CSV con evaluaciones</p>
            </div>
          </Link>

          <Link
            href="/reports"
            className="group flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white/60 p-4
                       hover:border-blue-300 hover:bg-blue-50/40 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow shadow-indigo-500/15 group-hover:scale-105 transition-transform flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                Ver reportes
              </p>
              <p className="text-xs text-slate-400">Consulta reportes generados</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Tip ── */}
      <div className="mt-6 bg-blue-50/50 backdrop-blur-sm border border-blue-100/80 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
        </div>
        <p className="text-sm text-blue-700/80">
          Sube tu archivo de evaluaciones y selecciona las preguntas a analizar.
          Los análisis recientes se mantienen disponibles aunque cambies de pestaña.
        </p>
      </div>
    </div>
  );
}
