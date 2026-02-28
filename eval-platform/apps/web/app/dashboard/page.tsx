"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-guard";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    supabase.from("reports").select("id", { count: "exact", head: true }).then(({ count }) => {
      setReportCount(count || 0);
    });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 mt-1">Panel de control de EvalPlatform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Reportes guardados</p>
              <p className="text-2xl font-bold text-slate-900">{reportCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Rol</p>
              <p className="text-2xl font-bold text-slate-900">{isAdmin ? "Admin" : "Usuario"}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-xl">📧</span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Correo</p>
              <p className="text-sm font-medium text-slate-900 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/upload" className="group bg-white rounded-xl border border-slate-200 p-8 hover:border-blue-300 hover:shadow-lg transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
            <span className="text-2xl">📁</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Subir archivo</h3>
          <p className="text-sm text-slate-500">Sube un archivo XLSX o CSV con evaluaciones para analizar</p>
        </Link>

        <Link href="/reports" className="group bg-white rounded-xl border border-slate-200 p-8 hover:border-blue-300 hover:shadow-lg transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">Ver reportes</h3>
          <p className="text-sm text-slate-500">Consulta reportes generados anteriormente</p>
        </Link>
      </div>
    </div>
  );
}