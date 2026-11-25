"use client";

/**
 * Light SVG charts for the dashboard and the financial reports (no chart library).
 * Colours are the validated categorical palette (slot 1 blue, 2 orange, 3 aqua, 4 violet);
 * the "previous period" line is a neutral grey ghost of the current one. Text always uses ink
 * colours, never the series colour, and every chart has hover values plus visible labels.
 */
import { useEffect, useMemo, useRef, useState } from "react";

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6", "#eda100", "#e87ba4"] as const;
const PREVIOUS = "#94A3B8";
const GRID = "#EEF2F6";
const INK = "#0F172A";
const MUTED = "#64748B";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A round step (1, 2, 5 x 10^n, never below 1) so the 4 axis lines read 0, 25, 50, 75, 100. */
function niceStep(value: number): number {
  if (value <= 1) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * exp;
}
const niceMax = (value: number) => niceStep(value / 4) * 4;
/** 1500 -> 1.5K on the axis (the exact value is in the tooltip). */
const compact = (n: number) => n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${+(n / 1000).toFixed(1)}K` : String(Math.round(n));

export interface TrendPoint { label: string; current: number; previous?: number | null; previousLabel?: string }

/**
 * Current period as a filled line, the period before it as a dashed grey line on the same axis,
 * crosshair + tooltip on hover. Time always runs left to right, also in Arabic.
 */
export function TrendChart({ points, format, currentName, previousName, height = 240, emptyText }: {
  points: TrendPoint[];
  format: (n: number) => string;
  currentName: string;
  previousName?: string;
  height?: number;
  emptyText: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const hasPrevious = Boolean(previousName) && points.some((p) => p.previous != null);
  const max = niceMax(Math.max(0, ...points.map((p) => Math.max(p.current, p.previous ?? 0))));
  const pad = { top: 12, right: 16, bottom: 28, left: 48 };
  const w = Math.max(width, 280);
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length <= 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const path = (values: number[]) => values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const current = points.map((p) => p.current);
  const area = points.length ? `${path(current)} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 70))));
  const empty = points.every((p) => !p.current && !p.previous);

  return (
    <div ref={ref} className="relative w-full" dir="ltr">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-[#475569]" dir="auto">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: SERIES[0] }} />{currentName}</span>
        {hasPrevious && <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: PREVIOUS }} />{previousName}</span>}
      </div>
      {empty ? <p className="grid place-items-center text-sm text-[#94A3B8]" style={{ height }}>{emptyText}</p> : (
        <svg width={w} height={height} role="img" aria-label={currentName} className="block overflow-visible" style={{ direction: 'ltr' }}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const px = e.clientX - box.left - pad.left;
            const i = points.length <= 1 ? 0 : Math.round((px / innerW) * (points.length - 1));
            setHover(Math.max(0, Math.min(points.length - 1, i)));
          }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0]} stopOpacity="0.18" />
              <stop offset="100%" stopColor={SERIES[0]} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={w - pad.right} y1={y(max * t)} y2={y(max * t)} stroke={GRID} />
              <text x={pad.left - 8} y={y(max * t) + 4} textAnchor="end" fontSize="10" fill={MUTED} style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{compact(max * t)}</text>
            </g>
          ))}
          {points.map((p, i) => i % labelEvery === 0 || (i === points.length - 1 && i % labelEvery >= Math.ceil(labelEvery * 0.7)) ? (
            <text key={p.label + i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill={MUTED}>{p.label}</text>
          ) : null)}
          {hasPrevious && <path d={path(points.map((p) => p.previous ?? 0))} fill="none" stroke={PREVIOUS} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />}
          <path d={area} fill="url(#trend-fill)" />
          <path d={path(current)} fill="none" stroke={SERIES[0]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#CBD5E1" />
              <circle cx={x(hover)} cy={y(points[hover].current)} r="4.5" fill={SERIES[0]} stroke="#fff" strokeWidth="2" />
              {hasPrevious && points[hover].previous != null && <circle cx={x(hover)} cy={y(points[hover].previous ?? 0)} r="4" fill={PREVIOUS} stroke="#fff" strokeWidth="2" />}
            </g>
          )}
        </svg>
      )}
      {hover !== null && !empty && (
        <div className="pointer-events-none absolute top-8 z-10 min-w-[150px] rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hover) - 75, 0), w - 160) }} dir="auto">
          <p className="mb-1 font-semibold text-[#0F172A]">{points[hover].label}</p>
          <p className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: SERIES[0] }} />{currentName}</span><b>{format(points[hover].current)}</b></p>
          {hasPrevious && points[hover].previous != null && (
            <p className="mt-0.5 flex items-center justify-between gap-3 text-[#64748B]"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PREVIOUS }} />{points[hover].previousLabel ?? previousName}</span><b>{format(points[hover].previous ?? 0)}</b></p>
          )}
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars: name and value as text, a thin bar for the size. */
export function BarList({ items, format, color = SERIES[0], emptyText, limit = 8 }: {
  items: { key: string | number; label: string; value: number; sub?: string }[];
  format: (n: number) => string;
  color?: string;
  emptyText: string;
  limit?: number;
}) {
  const shown = items.slice(0, limit);
  const max = Math.max(1, ...shown.map((i) => i.value));
  if (!shown.length) return <p className="py-8 text-center text-sm text-[#94A3B8]">{emptyText}</p>;
  return (
    <ol className="space-y-3">
      {shown.map((item, index) => (
        <li key={item.key} title={`${item.label}: ${format(item.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[#0F172A]"><span className="me-1.5 text-xs text-[#94A3B8]">{index + 1}</span><bdi>{item.label}</bdi>{item.sub && <span className="ms-2 text-xs text-[#94A3B8]">{item.sub}</span>}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[#0F172A]">{format(item.value)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#F1F5F9]">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Parts of a whole (2-4 parts). Every part is named with its value and share in the legend. */
export function Donut({ parts, format, centerLabel, emptyText, size = 160 }: {
  parts: { label: string; value: number; color?: string }[];
  format: (n: number) => string;
  centerLabel: string;
  emptyText: string;
  size?: number;
}) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const arcs = useMemo(() => {
    const lengths = parts.map((p) => (total > 0 ? (Math.max(0, p.value) / total) * c : 0));
    return parts.map((p, i) => ({
      ...p,
      color: p.color ?? SERIES[i % SERIES.length],
      length: lengths[i],
      offset: lengths.slice(0, i).reduce((sum, l) => sum + l, 0),
    }));
  }, [parts, total, c]);
  if (total <= 0) return <p className="py-8 text-center text-sm text-[#94A3B8]">{emptyText}</p>;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="18" />
          {arcs.map((a) => a.length > 0 && (
            <circle key={a.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={a.color} strokeWidth="18"
              strokeDasharray={`${Math.max(0, a.length - (arcs.filter((x) => x.length > 0).length > 1 ? 2 : 0))} ${c}`} strokeDashoffset={-a.offset}>
              <title>{`${a.label}: ${format(a.value)}`}</title>
            </circle>
          ))}
        </g>
        <text x="50%" y="47%" textAnchor="middle" fontSize="15" fontWeight="700" fill={INK}>{format(total)}</text>
        <text x="50%" y="60%" textAnchor="middle" fontSize="10" fill={MUTED}>{centerLabel}</text>
      </svg>
      <ul className="min-w-[150px] flex-1 space-y-2 text-sm">
        {arcs.map((a) => (
          <li key={a.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2 text-[#475569]"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.color }} /><bdi className="break-words">{a.label}</bdi></span>
            <span className="shrink-0 tabular-nums text-[#0F172A]"><b>{format(a.value)}</b> <span className="text-xs text-[#94A3B8]">{Math.round((Math.max(0, a.value) / total) * 100)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical bars for a few categories (e.g. score bands), value on top of each bar. */
export function ColumnChart({ items, format, color = SERIES[0], height = 180, emptyText, dir = 'ltr' }: {
  items: { label: string; value: number; color?: string }[];
  format: (n: number) => string;
  color?: string;
  height?: number;
  emptyText: string;
  /** 'ltr' for time axes (hours, score bands); the page direction for named categories such as weekdays. */
  dir?: 'ltr' | 'rtl';
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.some((i) => i.value > 0)) return <p className="py-8 text-center text-sm text-[#94A3B8]">{emptyText}</p>;
  return (
    <div className="flex items-end gap-2" style={{ height }} dir={dir}>
      {items.map((item) => (
        <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${item.label}: ${format(item.value)}`}>
          <span className="text-xs font-semibold tabular-nums text-[#0F172A]">{format(item.value)}</span>
          <div className="w-full max-w-[56px] rounded-t-[4px]" style={{ height: `${Math.max(2, (item.value / max) * 78)}%`, background: item.color ?? color }} />
          <span className="truncate text-[11px] text-[#64748B]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Change against the previous period: green up / red down with an arrow, never colour alone. */
export function ChangeBadge({ change, inverse = false, ar }: { change: number | null | undefined; inverse?: boolean; ar: boolean }) {
  if (change == null) return <span className="text-[11px] text-[#94A3B8]">{ar ? "جديد" : "new"}</span>;
  if (change === 0) return <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-semibold text-[#64748B]">0%</span>;
  const good = inverse ? change < 0 : change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} dir="ltr">
      {change > 0 ? "▲" : "▼"} {Math.abs(change).toLocaleString(ar ? "ar-EG" : "en-GB", { maximumFractionDigits: 1 })}%
    </span>
  );
}

/** Tiny line of the current period inside a KPI card. */
export function Sparkline({ values, color = SERIES[0], width = 96, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * width).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(" ");
  return <svg width={width} height={height} aria-hidden className="block"><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
