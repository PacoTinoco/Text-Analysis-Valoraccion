"use client";

import { useEffect, useState } from "react";

type HealthStatus = {
  status: string;
  version: string;
  service: string;
} | null;

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Bienvenido a EvalPlatform — tu centro de análisis de evaluaciones docentes
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatusCard
          title="Estado del API"
          loading={loading}
          error={error}
          value={health?.status === "ok" ? "Conectado ✓" : "Desconectado ✗"}
          ok={health?.status === "ok"}
        />
        <StatusCard
          title="Versión"
          loading={loading}
          error={error}
          value={health?.version || "—"}
          ok={true}
        />
        <StatusCard
          title="Servicio"
          loading={loading}
          error={error}
          value={health?.service || "—"}
          ok={true}
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Para comenzar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            href="/upload"
            icon="📁"
            title="Subir archivo"
            description="Sube un archivo XLSX o CSV con evaluaciones para analizar"
          />
          <QuickAction
            href="/reports"
            title="Ver reportes"
            icon="📋"
            description="Consulta reportes generados anteriormente"
          />
        </div>
      </div>

      {/* Module Progress */}
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Progreso de desarrollo
        </h2>
        <div className="space-y-3">
          <ModuleStatus name="Módulo 1 — Fundación" status="active" />
          <ModuleStatus name="Módulo 2 — Upload & Parsing" status="pending" />
          <ModuleStatus name="Módulo 3 — Filtros Dinámicos" status="pending" />
          <ModuleStatus name="Módulo 4 — Motor de Análisis" status="pending" />
          <ModuleStatus name="Módulo 5 — IA (Claude API)" status="pending" />
          <ModuleStatus name="Módulo 6 — Dashboard & Reportes" status="pending" />
          <ModuleStatus name="Módulo 7 — Auth & Multi-usuario" status="pending" />
          <ModuleStatus name="Módulo 8 — Deploy" status="pending" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  loading,
  error,
  value,
  ok,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      {loading ? (
        <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
      ) : error ? (
        <p className="text-red-600 font-semibold text-lg">Error: {error}</p>
      ) : (
        <p
          className={`font-semibold text-lg ${ok ? "text-emerald-600" : "text-red-600"}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
    </a>
  );
}

function ModuleStatus({
  name,
  status,
}: {
  name: string;
  status: "done" | "active" | "pending";
}) {
  const styles = {
    done: "bg-emerald-100 text-emerald-700 border-emerald-200",
    active: "bg-brand-100 text-brand-700 border-brand-200",
    pending: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const labels = { done: "Completado", active: "En progreso", pending: "Pendiente" };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-700">{name}</span>
      <span
        className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${styles[status]}`}
      >
        {labels[status]}
      </span>
    </div>
  );
}
