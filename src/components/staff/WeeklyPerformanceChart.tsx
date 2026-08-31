"use client";

import { useState } from "react";
import type { WeekdayPoint } from "@/lib/staff-stats";

function niceCeil(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export default function WeeklyPerformanceChart({ points }: { points: WeekdayPoint[] }) {
  const [showPrior, setShowPrior] = useState(true);

  const width = 640;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 24, left: 50 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxRaw = Math.max(1, ...points.map((p) => p.current), ...(showPrior ? points.map((p) => p.prior) : [0]));
  const niceMax = niceCeil(maxRaw);
  const yTicks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

  const x = (i: number) => padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - (v / niceMax) * innerH;

  const currentPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.current).toFixed(1)}`).join(" ");
  const priorPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.prior).toFixed(1)}`).join(" ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-ok" />Kjo periudhë</span>
          {showPrior && (
            <span className="flex items-center gap-1.5 text-ink-faint">
              <span className="h-0.5 w-4 rounded-full border-t-2 border-dashed border-ink-faint" />
              Periudha e kaluar
            </span>
          )}
        </div>
        <select
          value={showPrior ? "compare" : "none"}
          onChange={(e) => setShowPrior(e.target.value === "compare")}
          className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="compare">Krahaso me periudhën e kaluar</option>
          <option value="none">Pa krahasim</option>
        </select>
      </div>

      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
              <text x={padding.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-ink-faint" fontSize={10}>
                {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k €` : `${t.toFixed(0)} €`}
              </text>
            </g>
          ))}

          {showPrior && <path d={priorPath} fill="none" className="stroke-ink-faint" strokeWidth={1.5} strokeDasharray="4 3" />}
          <path d={currentPath} fill="none" className="stroke-ok" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {showPrior && points.map((p, i) => <circle key={`p${i}`} cx={x(i)} cy={y(p.prior)} r={2.5} className="fill-ink-faint" />)}
          {points.map((p, i) => <circle key={`c${i}`} cx={x(i)} cy={y(p.current)} r={3.5} className="fill-ok" />)}

          {points.map((p, i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-ink-faint" fontSize={10}>
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
