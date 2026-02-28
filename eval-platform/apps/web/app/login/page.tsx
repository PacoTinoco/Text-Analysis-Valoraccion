"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const validateEmail = (email: string) => {
    return email.endsWith("@iteso.mx");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validateEmail(email)) {
      setMessage({ type: "error", text: "Solo se permiten correos @iteso.mx" });
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setMessage({ type: "success", text: "Revisa tu correo @iteso.mx para confirmar tu cuenta." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      const msg = err.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos"
        : err.message === "User already registered"
        ? "Este correo ya está registrado. Inicia sesión."
        : err.message;
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-white">
              Eval<span className="text-blue-400">Platform</span>
            </h1>
          </Link>
          <p className="text-blue-200 mt-2 text-sm">Análisis de evaluaciones docentes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => { setMode("login"); setMessage(null); }}
              className={"flex-1 py-2 text-sm font-medium rounded-md transition-colors " + (mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >Iniciar sesión</button>
            <button
              onClick={() => { setMode("register"); setMessage(null); }}
              className={"flex-1 py-2 text-sm font-medium rounded-md transition-colors " + (mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >Registrarse</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Francisco Tinoco"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo institucional</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tu.nombre@iteso.mx"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required minLength={6}
              />
            </div>

            {message && (
              <div className={"p-3 rounded-lg text-sm " + (message.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200")}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {loading ? "Cargando..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">Solo correos @iteso.mx</p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-blue-300 hover:text-blue-200 transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}