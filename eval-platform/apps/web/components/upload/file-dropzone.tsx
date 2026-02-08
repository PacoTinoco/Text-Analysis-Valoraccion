"use client";

import { useCallback, useState } from "react";

type ColumnInfo = {
  name: string;
  dtype: string;
  null_count: number;
  unique_count: number;
  unique_values?: string[];
};

type UploadResult = {
  filename: string;
  size_mb: number;
  rows: number;
  columns: ColumnInfo[];
  filepath: string;
};

type FileDropzoneProps = {
  onUploadComplete: (result: UploadResult) => void;
};

export default function FileDropzone({ onUploadComplete }: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "parsing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validar extensión
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "csv") {
        setError("Solo se aceptan archivos .xlsx o .csv");
        return;
      }

      // Validar tamaño (100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError("El archivo excede el límite de 100 MB");
        return;
      }

      setError(null);
      setFileName(file.name);
      setUploading(true);
      setPhase("uploading");
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setProgress(pct);
              if (pct >= 100) setPhase("parsing");
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || `Error ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("Error de conexión con el servidor"))
          );

          xhr.open("POST", "/api/v1/upload");
          xhr.send(formData);
        });

        setPhase("idle");
        setUploading(false);
        onUploadComplete(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setUploading(false);
        setPhase("idle");
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12
          flex flex-col items-center justify-center text-center
          transition-all duration-200 cursor-pointer
          ${
            dragActive
              ? "border-brand-500 bg-brand-50"
              : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
        onClick={() => {
          if (!uploading) {
            document.getElementById("file-input")?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={handleInputChange}
        />

        {!uploading ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
              <span className="text-3xl">📄</span>
            </div>
            <p className="text-slate-700 font-medium text-lg">
              {dragActive
                ? "Suelta tu archivo aquí"
                : "Arrastra y suelta tu archivo aquí"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              o haz clic para seleccionar
            </p>
            <p className="text-slate-400 text-xs mt-3">
              Formatos: .xlsx, .csv — Máximo 100 MB
            </p>
          </>
        ) : (
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                {phase === "parsing" ? (
                  <span className="text-lg animate-spin">⚙️</span>
                ) : (
                  <span className="text-lg">📤</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {fileName}
                </p>
                <p className="text-xs text-slate-500">
                  {phase === "uploading"
                    ? `Subiendo... ${progress}%`
                    : "Analizando estructura del archivo..."}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  phase === "parsing"
                    ? "bg-amber-500 animate-pulse w-full"
                    : "bg-brand-500"
                }`}
                style={
                  phase === "uploading" ? { width: `${progress}%` } : undefined
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
