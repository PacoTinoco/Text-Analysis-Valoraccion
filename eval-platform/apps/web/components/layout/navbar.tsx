"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: scrolled ? "10px 0" : "16px 0",
      background: scrolled ? "rgba(2, 6, 23, 0.85)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      transition: "all 0.3s",
    }}>
      <div style={{
        maxWidth: 1140, margin: "0 auto", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 20, fontWeight: 800, color: "#cbd5e1",
          textDecoration: "none", letterSpacing: "-0.01em",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Eval<span style={{ color: "#3b82f6" }}>Platform</span>
        </Link>

        <div style={{ display: "flex", gap: 32 }} className="nav-links-desktop">
          <a href="#caracteristicas" style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8", textDecoration: "none" }}>
            Características
          </a>
          <a href="#como-funciona" style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8", textDecoration: "none" }}>
            Cómo Funciona
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }} className="nav-actions-desktop">
          <Link href="/login" style={{
            fontSize: 14, fontWeight: 500, color: "#94a3b8", textDecoration: "none",
          }}>
            Iniciar Sesión
          </Link>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center",
            padding: "9px 20px", background: "#2563eb", color: "white",
            fontSize: 13, fontWeight: 600, borderRadius: 10,
            textDecoration: "none", boxShadow: "0 2px 12px rgba(37,99,235,0.3)",
            transition: "all 0.25s",
          }}>
            Analiza Tus Evaluaciones
          </Link>
        </div>
      </div>
    </nav>
  );
}