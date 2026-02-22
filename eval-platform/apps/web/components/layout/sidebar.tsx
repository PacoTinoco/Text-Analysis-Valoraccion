"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-guard";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/upload", label: "Subir archivo", icon: "📁" },
  { href: "/reports", label: "Reportes", icon: "📋" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <aside className="w-60 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-lg font-bold">
          Eval<span className="text-blue-400">Platform</span>
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">Análisis docente</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors " +
                (isActive ? "bg-blue-600 text-white font-medium" : "text-slate-300 hover:bg-slate-800 hover:text-white")}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link href="/admin"
            className={"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors " +
              (pathname === "/admin" ? "bg-purple-600 text-white font-medium" : "text-purple-300 hover:bg-slate-800 hover:text-white")}>
            <span>⚙️</span>
            Admin
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name || "Usuario"}</p>
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