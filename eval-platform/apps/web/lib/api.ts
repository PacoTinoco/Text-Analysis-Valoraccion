// En desarrollo: http://localhost:8000
// En producción: la URL de tu backend en Render/Railway
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}