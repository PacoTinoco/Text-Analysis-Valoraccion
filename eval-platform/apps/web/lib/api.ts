// En desarrollo: http://localhost:8000 (con proxy vía next.config.js rewrites)
// En producción (Vercel): usa rutas relativas para que el proxy de Next.js funcione
//   → Vercel rewrites "/api/v1/*" al backend real (configurar API_URL en Vercel env vars)
//
// Si NEXT_PUBLIC_API_URL está configurada, la usa directamente (ej: URL de Render).
// Si no, usa "" para que las llamadas sean relativas (ej: /api/v1/multi-analyze)
// y pasen por el proxy de Next.js rewrites.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
