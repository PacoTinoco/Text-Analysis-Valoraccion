"use client";

import { useState } from "react";

type Props = {
  text: string;
  previewLength?: number;
  variant?: "positive" | "negative" | "suggestion" | "neutral";
};

const variantStyles = {
  positive: "bg-emerald-50 border-emerald-200",
  negative: "bg-red-50 border-red-200",
  suggestion: "bg-amber-50 border-amber-200",
  neutral: "bg-slate-50 border-slate-200",
};

export default function ExpandableResponse({
  text,
  previewLength = 250,
  variant = "neutral",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > previewLength;
  const displayText = expanded || !needsTruncation ? text : text.slice(0, previewLength) + "...";

  return (
    <div
      className={
        "p-3 rounded-lg border text-sm text-slate-700 transition-all cursor-pointer hover:shadow-sm "
        + variantStyles[variant]
      }
      onClick={() => needsTruncation && setExpanded(!expanded)}
    >
      <p className="whitespace-pre-line leading-relaxed">{displayText}</p>
      {needsTruncation && (
        <button
          className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "▲ Ver menos" : "▼ Ver respuesta completa"}
        </button>
      )}
    </div>
  );
}