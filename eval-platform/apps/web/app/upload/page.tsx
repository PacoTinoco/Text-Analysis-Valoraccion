export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Subir archivo</h1>
      <p className="text-slate-500 mb-8">
        Sube un archivo XLSX o CSV para comenzar el análisis.
      </p>
      <div className="card p-12 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
        <span className="text-4xl mb-3">📁</span>
        <p className="text-slate-600 font-medium">Módulo 2 — Próximamente</p>
        <p className="text-sm text-slate-400 mt-1">
          Aquí podrás arrastrar y soltar archivos para análisis
        </p>
      </div>
    </div>
  );
}
