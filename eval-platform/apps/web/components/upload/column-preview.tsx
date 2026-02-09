"use client";

import { useState } from "react";

type ColumnInfo = {
  name: string;
  dtype: string;
  null_count: number;
  unique_count: number;
  unique_values?: string[];
};

type UploadResult = {
  file_id: string;
  filename: string;
  size_mb: number;
  rows: number;
  columns: ColumnInfo[];
  filepath: string;
};

export type AnalysisConfig = {
  file_id: string;
  filepath: string;
  filename: string;
  responseColumn: string;
  filters: Record<string, string[]>;
};

type ColumnPreviewProps = {
  data: UploadResult;
  onContinue: (config: AnalysisConfig) => void;
  onReset: () => void;
};

export default function ColumnPreview({
  data,
  onContinue,
  onReset,
}: ColumnPreviewProps) {
const textColumns = data.columns;

  const [responseCol, setResponseCol] = useState(
    textColumns.find((c) => c.name.toLowerCase().includes("respuesta"))?.name ||
      textColumns[0]?.name ||
      ""
  );

  const filterColumns = data.columns.filter(
    (c) => c.unique_values && c.unique_count >= 1 && c.unique_count <= 200
  );

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  const toggleFilterValue = (column: string, value: string) => {
    setSelectedFilters((prev) => {
      const current = prev[column] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      if (next.length === 0) {
        const rest = { ...prev };
        delete rest[column];
        return rest;
      }
      return { ...prev, [column]: next };
    });
  };

  const selectAll = (column: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [column]: [...values] }));
  };

  const clearColumn = (column: string) => {
    setSelectedFilters((prev) => {
      const rest = { ...prev };
      delete rest[column];
      return rest;
    });
  };

  const activeFilterCount = Object.values(selectedFilters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* File summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{data.filename}</p>
              <p className="text-sm text-slate-500">
                {data.rows.toLocaleString()} filas · {data.columns.length}{" "}
                columnas · {data.size_mb} MB
              </p>
            </div>
          </div>
          <button onClick={onReset} className="btn-secondary text-sm">
            Cambiar archivo
          </button>
        </div>
      </div>

      {/* Response column selector */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-1">
          Columna de respuestas a analizar
        </h3>
        <p className="text-sm text-slate-500 mb-3">
          Selecciona la columna que contiene las respuestas de texto libre.
        </p>
        <select
          value={responseCol}
          onChange={(e) => setResponseCol(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">— Seleccionar columna —</option>
          {data.columns
            .filter((c) => c.dtype === "object")
            .map((col) => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.unique_count.toLocaleString()} valores únicos
                {col.null_count > 0 ? ", " + col.null_count + " nulos" : ""})
              </option>
            ))}
        </select>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-900">Filtros</h3>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {activeFilterCount} seleccionados
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Selecciona valores específicos para filtrar los datos. Si no
          seleccionas nada, se analizan todos.
        </p>

        <div className="space-y-2">
          {filterColumns.map((col) => {
            const isExpanded = expandedFilter === col.name;
            const selected = selectedFilters[col.name] || [];
            const values = col.unique_values || [];

            return (
              <div
                key={col.name}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedFilter(isExpanded ? null : col.name)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {col.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {col.unique_count} opciones
                    </span>
                    {selected.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {selected.length} selec.
                      </span>
                    )}
                  </div>
                  <span
                    className={"text-slate-400 transition-transform " + (isExpanded ? "rotate-180" : "")}
                  >
                    ▼
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-slate-100">
                    <div className="flex gap-2 py-2 mb-1">
                      <button
                        onClick={() => selectAll(col.name, values)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => clearColumn(col.name)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Limpiar
                      </button>
                    </div>

                    <div
                      className={values.length > 10 ? "max-h-48 overflow-y-auto space-y-1" : "space-y-1"}
                    >
                      {values.map((val) => (
                        <label
                          key={val}
                          className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 px-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(val)}
                            onChange={() => toggleFilterValue(col.name, val)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 truncate">
                            {val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue button */}
      <div className="flex justify-end gap-3">
        <button onClick={onReset} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={() =>
            onContinue({
              file_id: data.file_id,
              filepath: data.filepath,
              filename: data.filename,
              responseColumn: responseCol,
              filters: selectedFilters,
            })
          }
          disabled={!responseCol}
          className="btn-primary"
        >
          Continuar al análisis →
        </button>
      </div>
    </div>
  );
}