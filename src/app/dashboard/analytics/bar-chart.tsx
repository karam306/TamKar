"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { Currency } from "@/lib/types";

/** One-series bar chart with a hover tooltip (sales per day). */
export function BarChart({ data, format }: { data: { label: string; value: number; note?: string }[]; format: Currency }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 720;
  const H = 200;
  const pad = 24;
  const slot = (W - pad) / data.length;
  const bar = Math.max(2, slot - 2);
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const fmtDay = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString("ar-SY", { day: "numeric", month: "short" });
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label="المبيعات حسب اليوم" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => {
          const y = H - (t / max) * (H - 10);
          return (
            <g key={t}>
              <line x1={pad} x2={W} y1={y} y2={y} stroke="#ebebeb" strokeWidth={1} />
              <text x={0} y={y + 4} fontSize={10} fill="#8a8a8a">
                {t >= 1000 ? `${Math.round(t / 1000)}k` : Math.round(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bh = d.value ? Math.max(3, (d.value / max) * (H - 10)) : 0;
          const x = pad + i * slot + (slot - bar) / 2;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)}>
              <rect x={pad + i * slot} y={0} width={slot} height={H} fill="transparent" />
              {bh > 0 && <path d={roundedTop(x, H - bh, bar, bh, Math.min(4, bar / 2))} fill={hover === i ? "#000" : "#303030"} />}
            </g>
          );
        })}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text key={i} x={pad + i * slot + slot / 2} y={H + 16} fontSize={10} fill="#8a8a8a" textAnchor="middle">
            {data[i] && fmtDay(data[i].label)}
          </text>
        ))}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-white px-3 py-2 text-[12px] shadow-lg ring-1 ring-black/10" dir="rtl" style={{ left: `${Math.min(80, ((hover! + 0.5) / data.length) * 100)}%` }}>
          <div className="text-muted">{fmtDay(h.label)}</div>
          <div className="font-semibold">{formatPrice(h.value, format)}</div>
          {h.note && <div className="text-muted">{h.note}</div>}
        </div>
      )}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
