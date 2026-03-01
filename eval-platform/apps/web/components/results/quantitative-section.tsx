"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type DistributionItem = { count: number; pct: number };
type QuantSummary = {
  total: number;
  valid: number;
  invalid: number;
  mean: number;
  median: number;
  std_dev: number;
  min: number;
  max: number;
};
export type QuantitativeResult = {
  summary: QuantSummary;
  distribution: Record<string, DistributionItem>;
};

type Props = {
  data: QuantitativeResult;
  groupData?: Record<string, QuantitativeResult>;
  questionNumber: string;
};

const DIST_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981"];

function getMeanColor(mean: number): string {
  if (mean >= 4.5) return "text-emerald-600";
  if (mean >= 3.5) return "text-blue-600";
  if (mean >= 2.5) return "text-amber-600";
  return "text-red-600";
}

export default function QuantitativeSection({
  data,
  groupData,
  questionNumber,
}: Props) {
  const { summary, distribution } = data;

  // Chart data for distribution
  const distData = Object.entries(distribution).map(([value, d]) => ({
    name: value,
    count: d.count,
    pct: d.pct,
  }));

  // Group comparison data
  const groupCompareData = groupData
    ? Object.entries(groupData)
        .map(([name, gd]) => ({
          name,
          promedio: gd.summary.mean,
          respuestas: gd.summary.valid,
        }))
        .sort((a, b) => b.promedio - a.promedio)
    : [];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Promedio</p>
          <p className={"text-2xl font-bold " + getMeanColor(summary.mean)}>
            {summary.mean.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">de 5.00</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Mediana</p>
          <p className="text-2xl font-bold text-slate-900">
            {summary.median.toFixed(1)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Desv. Est.</p>
          <p className="text-2xl font-bold text-slate-900">
            {summary.std_dev.toFixed(2)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Respuestas</p>
          <p className="text-2xl font-bold text-slate-900">
            {summary.valid.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Inválidas</p>
          <p className="text-2xl font-bold text-slate-400">
            {summary.invalid}
          </p>
        </div>
      </div>

      {/* Distribution chart */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-1">
          Distribución de respuestas — Pregunta {questionNumber}
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Escala 1 (más bajo) a 5 (más alto)
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={distData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 14 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "count") return [value, "Respuestas"];
                return [value + "%", "Porcentaje"];
              }}
            />
            <Bar dataKey="count" name="count" radius={[4, 4, 0, 0]}>
              {distData.map((_, index) => (
                <Cell key={index} fill={DIST_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Distribution table */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {distData.map((d, i) => (
            <div
              key={d.name}
              className="text-center rounded-lg p-2"
              style={{
                backgroundColor: DIST_COLORS[i] + "15",
              }}
            >
              <p className="text-lg font-bold" style={{ color: DIST_COLORS[i] }}>
                {d.pct}%
              </p>
              <p className="text-xs text-slate-600">
                Valor {d.name} ({d.count})
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Group comparison */}
      {groupCompareData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-1">
            Promedio por grupo — Pregunta {questionNumber}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Ordenados de mayor a menor promedio
          </p>

          <ResponsiveContainer
            width="100%"
            height={Math.max(300, groupCompareData.length * 35)}
          >
            <BarChart
              data={groupCompareData}
              layout="vertical"
              margin={{ left: 60, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                domain={[0, 5]}
                tick={{ fontSize: 12 }}
                ticks={[1, 2, 3, 4, 5]}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={55}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "promedio") return [value.toFixed(2), "Promedio"];
                  return [value, "Respuestas"];
                }}
              />
              <Bar dataKey="promedio" name="promedio" radius={[0, 4, 4, 0]}>
                {groupCompareData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.promedio >= 4.5
                        ? "#10b981"
                        : entry.promedio >= 3.5
                        ? "#3b82f6"
                        : entry.promedio >= 2.5
                        ? "#eab308"
                        : "#ef4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Ranking table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">
                    #
                  </th>
                  <th className="text-left py-2 px-3 text-slate-500 font-medium">
                    Grupo
                  </th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">
                    Promedio
                  </th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">
                    Mediana
                  </th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">
                    Desv.
                  </th>
                  <th className="text-right py-2 px-3 text-slate-500 font-medium">
                    Resp.
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupCompareData.map((g, i) => {
                  const gd = groupData![g.name];
                  return (
                    <tr
                      key={g.name}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-2.5 px-3 text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {g.name}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={
                            "font-bold " + getMeanColor(gd.summary.mean)
                          }
                        >
                          {gd.summary.mean.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {gd.summary.median.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {gd.summary.std_dev.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {gd.summary.valid.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
