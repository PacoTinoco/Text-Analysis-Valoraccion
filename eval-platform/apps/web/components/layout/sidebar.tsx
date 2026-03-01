"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-guard";
import { useAnalysisStore } from "@/contexts/analysis-store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",    icon: "📊" },
  { href: "/upload",    label: "Subir archivo", icon: "📁" },
  { href: "/reports",   label: "Reportes",      icon: "📋" },
];

export default function Sidebar() {
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const { profile, isAdmin, signOut } = useAuth();
  const { analyses, removeAnalysis }  = useAnalysisStore();

  // The currently restored analysis (if any) — used to highlight the active item
  const activeRestoreId = searchParams.get("restore");

  return (
    <aside className="w-60 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* ── Brand ── */}
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-lg font-bold">
          Eval<span className="text-blue-400">Platform</span>
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">Análisis docente</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* ── Main nav ── */}
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href && !activeRestoreId;
          return (
            <Link key={item.href} href={item.href}
              className={
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors " +
                (isActive
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white")
              }>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link href="/admin"
            className={
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors " +
              (pathname === "/admin"
                ? "bg-purple-600 text-white font-medium"
                : "text-purple-300 hover:bg-slate-800 hover:text-white")
            }>
            <span>⚙️</span>
            Admin
          </Link>
        )}

        {/* ── Session analyses ── */}
        {analyses.length > 0 && (
          <div className="pt-3 mt-2 border-t border-slate-700">
            <p className="px-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              Análisis activos
              <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {analyses.length}
              </span>
            </p>

            {analyses.map((a) => {
              const isActive = activeRestoreId === a.id;
              const restoreHref = `/upload?restore=${a.id}`;
              const time = new Date(a.timestamp).toLocaleTimeString("es-MX", {
                hour: "2-digit", minute: "2-digit",
              });
              const qCount = a.result?.questions?.length ?? 0;

              return (
                <div key={a.id}
                  className={
                    "group flex items-start gap-2 px-2 py-2 rounded-lg text-xs transition-colors " +
                    (isActive
                      ? "bg-blue-900/60 text-blue-200"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
                  }>
                  {/* Restore link */}
                  <Link href={restoreHref} className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate leading-tight">
                      {a.title}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {qCount} preguntas · {time}
                    </p>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={() => removeAnalysis(a.id)}
                    title="Quitar de la lista"
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity mt-0.5 flex-shrink-0">
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* ── User footer ── */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {profile?.full_name?.charAt(0)?.toUpperCase() ||
             profile?.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name || "Usuario"}
            </p>
            <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
          </div>
        </div>
        <button onClick={signOut}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
