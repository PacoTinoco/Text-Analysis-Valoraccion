"use client";

import { useState, useMemo } from "react";

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

export type QuestionConfig = {
  question_number: string;
  analysis_type: "quantitative" | "qualitative";
};

export type MultiAnalysisConfig = {
  file_id: string;
  filename: string;
  pregunta_column: string;
  respuesta_column: string;
  questions: QuestionConfig[];
  filters: Record<string, string[]>;
  group_by: string | null;
};

type ColumnMappingProps = {
  data: UploadResult;
  onContinue: (config: MultiAnalysisConfig) => void;
  onReset: () => void;
};

export default function ColumnMapping({
  data,
  onContinue,
  onReset,
}: ColumnMappingProps) {
  // Auto-detectar columnas
  const defaultPregunta =
    data.columns.find((c) =>
      c.name.toLowerCase().includes("pregunta")
    )?.name || "";
  const defaultRespuesta =
    data.columns.find((c) =>
      c.name.toLowerCase().includes("respuesta")
    )?.name || "";
  const defaultGroupBy =
    data.columns.find((c) =>
      c.name.toLowerCase().includes("departamento")
    )?.name || "";

  const [preguntaCol, setPreguntaCol] = useState(defaultPregunta);
  const [respuestaCol, setRespuestaCol] = useState(defaultRespuesta);
  const [groupByCol, setGroupByCol] = useState(defaultGroupBy);

  // Preguntas disponibles (valores únicos de la columna PREGUNTA)
  const availableQuestions = useMemo(() => {
    if (!preguntaCol) return [];
    const col = data.columns.find((c) => c.name === preguntaCol);
    if (!col?.unique_values) return [];
    // Ordenar numéricamente si es posible
    return [...col.unique_values].sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [preguntaCol, data.columns]);

  // Preguntas seleccionadas y su tipo
  const [selectedQuestions, setSelectedQuestions] = useState<
    Record<string, "quantitative" | "qualitative">
  >({});

  // Filtros (reutilizar lógica existente)
  const filterColumns = data.columns.filter(
    (c) =>
      c.unique_values &&
      c.unique_count >= 1 &&
      c.unique_count <= 200 &&
      c.name !== preguntaCol &&
      c.name !== respuestaCol
  );
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  const toggleQuestion = (qNum: string) => {
    setSelectedQuestions((prev) => {
      const next = { ...prev };
      if (qNum in next) {
        delete next[qNum];
      } else {
        next[qNum] = "qualitative"; // default
      }
      return next;
    });
  };

  const setQuestionType = (
    qNum: string,
    type: "quantitative" | "qualitative"
  ) => {
    setSelectedQuestions((prev) => ({ ...prev, [qNum]: type }));
  };

  const selectAllAsType = (type: "quantitative" | "qualitative") => {
    const all: Record<string, "quantitative" | "qualitative"> = {};
    availableQuestions.forEach((q) => {
      all[q] = type;
    });
    setSelectedQuestions(all);
  };

  const clearAllQuestions = () => setSelectedQuestions({});

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

  const selectAllFilter = (column: string, values: string[]) => {
    setSelectedFilters((prev) => ({ ...prev, [column]: [...values] }));
  };

  const clearFilter = (column: string) => {
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

  const selectedCount = Object.keys(selectedQuestions).length;
  const canContinue =
    preguntaCol && respuestaCol && selectedCount > 0;

  const handleContinue = () => {
    const questions: QuestionConfig[] = Object.entries(selectedQuestions).map(
      ([qNum, type]) => ({
        question_number: qNum,
        analysis_type: type,
      })
    );

    onContinue({
      file_id: data.file_id,
      filename: data.filename,
      pregunta_column: preguntaCol,
      respuesta_column: respuestaCol,
      questions,
      filters: selectedFilters,
      group_by: groupByCol || null,
    });
  };

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

      {/* Column mapping */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-1">
          Mapeo de columnas
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Indica qué columna contiene el número de pregunta y cuál las
          respuestas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Columna de preguntas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Columna de preguntas
            </label>
            <select
              value={preguntaCol}
              onChange={(e) => {
                setPreguntaCol(e.target.value);
                setSelectedQuestions({});
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar —</option>
              {data.columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.unique_count} valores)
                </option>
              ))}
            </select>
          </div>

          {/* Columna de respuestas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Columna de respuestas
            </label>
            <select
              value={respuestaCol}
              onChange={(e) => setRespuestaCol(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar —</option>
              {data.columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.unique_count.toLocaleString()} valores)
                </option>
              ))}
            </select>
          </div>

          {/* Agrupar por */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Agrupar por (opcional)
            </label>
            <select
              value={groupByCol}
              onChange={(e) => setGroupByCol(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sin agrupación —</option>
              {data.columns
                .filter(
                  (c) => c.unique_count >= 2 && c.unique_count <= 200
                )
                .map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.unique_count} grupos)
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Question selection */}
      {preguntaCol && availableQuestions.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900">
              Selección de preguntas
            </h3>
            {selectedCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {selectedCount} seleccionadas
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Selecciona las preguntas a analizar e indica el tipo de cada una.
          </p>

          {/* Quick actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => selectAllAsType("quantitative")}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700
                         hover:bg-blue-50 transition-colors"
            >
              Todas cuantitativas
            </button>
            <button
              onClick={() => selectAllAsType("qualitative")}
              className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700
                         hover:bg-purple-50 transition-colors"
            >
              Todas cualitativas
            </button>
            <button
              onClick={clearAllQuestions}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500
                         hover:bg-slate-50 transition-colors"
            >
              Limpiar
            </button>
          </div>

          {/* Question list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableQuestions.map((qNum) => {
              const isSelected = qNum in selectedQuestions;
              const qType = selectedQuestions[qNum];

              return (
                <div
                  key={qNum}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    isSelected
                      ? qType === "quantitative"
                        ? "border-blue-300 bg-blue-50"
                        : "border-purple-300 bg-purple-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleQuestion(qNum)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-800">
                        Pregunta {qNum}
                      </span>
                    </label>
                  </div>

                  {isSelected && (
                    <div className="flex gap-1 mt-2 ml-6">
                      <button
                        onClick={() =>
                          setQuestionType(qNum, "quantitative")
                        }
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          qType === "quantitative"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Cuantitativa (1-5)
                      </button>
                      <button
                        onClick={() =>
                          setQuestionType(qNum, "qualitative")
                        }
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          qType === "qualitative"
                            ? "bg-purple-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Cualitativa (texto)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      {filterColumns.length > 0 && (
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
            Filtra los datos antes de analizar. Si no seleccionas nada, se
            analizan todos.
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
                      className={
                        "text-slate-400 transition-transform " +
                        (isExpanded ? "rotate-180" : "")
                      }
                    >
                      ▼
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-slate-100">
                      <div className="flex gap-2 py-2 mb-1">
                        <button
                          onClick={() => selectAllFilter(col.name, values)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Seleccionar todos
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => clearFilter(col.name)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Limpiar
                        </button>
                      </div>

                      <div
                        className={
                          values.length > 10
                            ? "max-h-48 overflow-y-auto space-y-1"
                            : "space-y-1"
                        }
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
      )}

      {/* Continue button */}
      <div className="flex justify-end gap-3">
        <button onClick={onReset} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="btn-primary"
        >
          {canContinue
            ? `Analizar ${selectedCount} pregunta${selectedCount > 1 ? "s" : ""} →`
            : "Selecciona columnas y preguntas"}
        </button>
      </div>
    </div>
  );
}
