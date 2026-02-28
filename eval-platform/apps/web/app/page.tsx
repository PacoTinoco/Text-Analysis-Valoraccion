"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/navbar";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", color: "#1e293b", overflowX: "hidden" }}>
      <Navbar />

      {/* =================== HERO =================== */}
      <section style={{
        position: "relative", minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", overflow: "hidden",
      }}>
        {/* Background */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(165deg, #020617 0%, #0f172a 30%, #1e293b 60%, #0f172a 100%)",
          zIndex: 0,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
          }} />
          <div style={{
            position: "absolute", width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, #2563eb, transparent)",
            top: -200, right: -100, filter: "blur(120px)", opacity: 0.3,
          }} />
          <div style={{
            position: "absolute", width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, #7c3aed, transparent)",
            bottom: -100, left: -50, filter: "blur(120px)", opacity: 0.2,
          }} />
        </div>

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 800 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 20px", background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.2)", borderRadius: 50,
            color: "#93c5fd", fontSize: 13, fontWeight: 500, marginBottom: 32,
            backdropFilter: "blur(8px)",
          }}>
            <span style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
            ✨ Transformando la Evaluación Docente
          </div>

          <h1 style={{
            fontSize: "clamp(32px, 5.5vw, 58px)", fontWeight: 700, color: "white",
            lineHeight: 1.15, marginBottom: 24, letterSpacing: "-0.02em",
          }}>
            Analiza Miles de Evaluaciones
            <br />
            Docentes en{" "}
            <span style={{
              background: "linear-gradient(135deg, #3b82f6, #22d3ee)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Minutos</span>
          </h1>

          <p style={{
            fontSize: "clamp(15px, 1.8vw, 18px)", color: "#94a3b8",
            lineHeight: 1.7, marginBottom: 40, maxWidth: 620, marginLeft: "auto", marginRight: "auto",
          }}>
            EvalPlatform automatiza el análisis de evaluaciones universitarias.
            Detecta sentimientos, identifica patrones lingüísticos y genera
            reportes interactivos — transformando semanas de trabajo en segundos.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 28px", background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "white", fontSize: 15, fontWeight: 600, borderRadius: 12,
              textDecoration: "none", boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
              transition: "all 0.3s",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
              Comenzar Análisis
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a href="#como-funciona" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 28px", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)", color: "white",
              fontSize: 15, fontWeight: 500, borderRadius: 12,
              textDecoration: "none", backdropFilter: "blur(8px)", transition: "all 0.3s",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              Ver Cómo Funciona
            </a>
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>
              Optimizado para universidades
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap", fontSize: 13, color: "#94a3b8" }}>
              <span>🏛️ Análisis en Español</span>
              <span style={{ color: "#334155" }}>•</span>
              <span>🧠 NLP Avanzado</span>
              <span style={{ color: "#334155" }}>•</span>
              <span>📊 Visualizaciones Interactivas</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", color: "#475569", zIndex: 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </section>

      {/* =================== FEATURES =================== */}
      <section id="caracteristicas" style={{ padding: "100px 0", background: "linear-gradient(180deg, #f0f5ff 0%, #f8fafc 100%)" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: "#2563eb", marginBottom: 16, textTransform: "uppercase" }}>
              CARACTERÍSTICAS PRINCIPALES
            </span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, marginBottom: 16 }}>
              Todo lo que necesitas para
              <br />analizar evaluaciones
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              Herramientas poderosas diseñadas específicamente para el análisis
              de evaluaciones docentes en universidades
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <FeatureCard icon={<SentimentIcon />} bg="#eff6ff" iconColor="#2563eb" border="#bfdbfe"
              title="Análisis de Sentimiento" description="Clasifica automáticamente cada respuesta como positiva, neutra o negativa usando NLP avanzado en español." />
            <FeatureCard icon={<KeywordsIcon />} bg="#fff7ed" iconColor="#ea580c" border="#fed7aa"
              title="Extracción de Palabras Clave" description="Identifica bigramas, trigramas y términos más frecuentes para detectar temas recurrentes en las evaluaciones." />
            <FeatureCard icon={<DetectionIcon />} bg="#f0fdfa" iconColor="#0d9488" border="#99f6e4"
              title="Detección de Profesores" description="Reconoce automáticamente los nombres de profesores mencionados en las respuestas para análisis por docente." />
            <FeatureCard icon={<DrilldownIcon />} bg="#fffbeb" iconColor="#d97706" border="#fde68a"
              title="Drill-Down Interactivo" description="Haz clic en cualquier palabra o frase para ver todas las respuestas relacionadas al instante." />
            <FeatureCard icon={<ChartsIcon />} bg="#eef2ff" iconColor="#4f46e5" border="#c7d2fe"
              title="Visualizaciones Avanzadas" description="Gráficos interactivos, nubes de palabras y rankings comparativos para entender los datos a simple vista." />
            <FeatureCard icon={<ExportIcon />} bg="#faf5ff" iconColor="#9333ea" border="#e9d5ff"
              title="Exportación HTML" description="Exporta reportes interactivos en HTML con todas las gráficas para compartir con tu equipo." />
          </div>
        </div>
      </section>

      {/* =================== HOW IT WORKS =================== */}
      <section id="como-funciona" style={{ padding: "100px 0", background: "#ffffff" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: "#2563eb", marginBottom: 16, textTransform: "uppercase" }}>
              CÓMO FUNCIONA
            </span>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, marginBottom: 16 }}>
              De archivo Excel a insights
              <br />en 3 simples pasos
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              Sin configuración compleja. Sube tu archivo y obtén resultados en minutos.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
            <StepCard number="01" title="Sube tu archivo" icon="📁"
              description="Arrastra y suelta tu archivo XLSX o CSV con las evaluaciones. Soportamos archivos de hasta 100,000 filas." />
            <div style={{ color: "#cbd5e1", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 8px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </div>
            <StepCard number="02" title="Configura el análisis" icon="⚙️"
              description="Selecciona las columnas a analizar, aplica filtros por departamento, periodo o pregunta, y lanza el análisis." />
            <div style={{ color: "#cbd5e1", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 8px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
              </svg>
            </div>
            <StepCard number="03" title="Explora los resultados" icon="📊"
              description="Visualiza sentimientos, palabras clave, rankings de departamentos y exporta reportes interactivos." />
          </div>
        </div>
      </section>

      {/* =================== CTA =================== */}
      <section style={{ position: "relative", padding: "100px 0", textAlign: "center", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(165deg, #020617, #0f172a 50%, #1e293b)",
        }}>
          <div style={{
            position: "absolute", width: 600, height: 300,
            background: "radial-gradient(ellipse, rgba(37,99,235,0.2), transparent)",
            top: "50%", left: "50%", transform: "translate(-50%, -50%)", filter: "blur(80px)",
          }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, color: "white", marginBottom: 16 }}>
            ¿Listo para transformar tus evaluaciones?
          </h2>
          <p style={{ fontSize: 16, color: "#94a3b8", marginBottom: 32, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
            Únete y comienza a analizar las evaluaciones docentes de tu universidad hoy mismo.
          </p>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 28px", background: "linear-gradient(135deg, #2563eb, #3b82f6)",
            color: "white", fontSize: 15, fontWeight: 600, borderRadius: 12,
            textDecoration: "none", boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
          }}>
            Crear cuenta gratuita
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>Solo correos institucionales @iteso.mx</p>
        </div>
      </section>

      {/* =================== FOOTER =================== */}
      <footer style={{ background: "#020617", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "40px 0" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Eval<span style={{ color: "#3b82f6" }}>Platform</span>
            </div>
            <p style={{ fontSize: 13, color: "#475569" }}>Análisis automatizado de evaluaciones docentes universitarias.</p>
          </div>
          <p style={{ fontSize: 12, color: "#334155" }}>&copy; {new Date().getFullYear()} EvalPlatform · ITESO</p>
        </div>
      </footer>
    </div>
  );
}

/* =================== FEATURE CARD =================== */
function FeatureCard({ icon, bg, iconColor, border, title, description }: {
  icon: React.ReactNode; bg: string; iconColor: string; border: string; title: string; description: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        border: `1px solid ${hovered ? border : "#e2e8f0"}`,
        borderRadius: 16, padding: "32px 28px",
        transition: "all 0.3s", cursor: "default",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: bg, display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, color: iconColor,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65 }}>{description}</p>
    </div>
  );
}

/* =================== STEP CARD =================== */
function StepCard({ number, title, description, icon }: {
  number: string; title: string; description: string; icon: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "white" : "#f8fafc",
        border: "1px solid #e2e8f0", borderRadius: 20,
        padding: "36px 28px", textAlign: "center", maxWidth: 300,
        transition: "all 0.3s",
        boxShadow: hovered ? "0 8px 30px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#3b82f6", letterSpacing: "0.05em", marginBottom: 16 }}>{number}</div>
      <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65 }}>{description}</p>
    </div>
  );
}

/* =================== SVG ICONS =================== */
function SentimentIcon() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>);
}
function KeywordsIcon() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>);
}
function DetectionIcon() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
}
function DrilldownIcon() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>);
}
function ChartsIcon() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
}
function ExportIcon() {
  return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);
}