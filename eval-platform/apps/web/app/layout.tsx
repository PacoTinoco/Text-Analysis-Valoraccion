import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/app-shell";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "EvalPlatform — Análisis de Evaluaciones Docentes",
  description: "Plataforma de análisis automatizado de evaluaciones docentes universitarias. Detecta sentimientos, identifica patrones lingüísticos y genera reportes interactivos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={dmSans.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}