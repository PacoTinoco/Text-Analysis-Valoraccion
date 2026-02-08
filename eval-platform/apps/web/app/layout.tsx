import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EvalPlatform — Análisis de Evaluaciones Docentes",
  description: "Plataforma de análisis automatizado de evaluaciones docentes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-brand-400">Eval</span>Platform
        </h1>
        <p className="text-xs text-slate-400 mt-1">Análisis docente</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <NavItem href="/" icon="📊" label="Dashboard" active />
        <NavItem href="/upload" icon="📁" label="Subir archivo" />
        <NavItem href="/analyze" icon="🔍" label="Analizar" />
        <NavItem href="/reports" icon="📋" label="Reportes" />
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span id="api-status" className="w-2 h-2 rounded-full bg-slate-500" />
          <span>API Status</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-brand-600/20 text-brand-300"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span>{icon}</span>
      {label}
    </a>
  );
}
