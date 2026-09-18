"use client";

import { forwardRef, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tag as TagType, TagTone } from "@/lib/data";
import { useRegisterPageActions, type PageActionsConfig } from "@/components/page-actions-context";

/* ---------- Tag / status pill ---------- */
const toneMap: Record<TagTone, { bg: string; text: string; dot: string }> = {
  teal: { bg: "bg-teal-bg", text: "text-teal-d", dot: "bg-teal" },
  amber: { bg: "bg-amber-bg", text: "text-amber", dot: "bg-amber" },
  red: { bg: "bg-red-bg", text: "text-red", dot: "bg-red" },
  green: { bg: "bg-green-bg", text: "text-green", dot: "bg-green" },
  violet: { bg: "bg-violet-bg", text: "text-violet", dot: "bg-violet" },
  grey: { bg: "bg-bg-2", text: "text-muted", dot: "bg-muted-2" },
};

export function Tag({ tone, label }: TagType) {
  const t = toneMap[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 text-[11.5px] font-medium font-mono whitespace-nowrap ${t.bg} ${t.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  );
}

/* ---------- Card ---------- */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[10px] border border-line bg-panel shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHead({
  icon,
  title,
  right,
}: {
  icon?: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3.5 md:px-4.5 md:py-3.75">
      <h3 className="flex items-center gap-2.5 font-display text-[15px] font-semibold">
        {icon && <span className="h-4.25 w-4.25 text-teal-d">{icon}</span>}
        {title}
      </h3>
      {right}
    </div>
  );
}

/* ---------- Card body ---------- */
// Single home for card content padding — compact on mobile, matches CardHead on md+.
// Pass layout utilities (flex/grid/gap/border) through `className`.
export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-4 md:px-4.5 md:py-3.75 ${className}`}>{children}</div>;
}

/* ---------- KPI card ---------- */
const kpiAccent: Record<string, string> = {
  teal: "before:bg-teal",
  amber: "before:bg-amber",
  red: "before:bg-red",
  green: "before:bg-green",
  violet: "before:bg-violet",
};

export function KpiCard({
  accent = "teal",
  label,
  value,
  unit,
  trend,
  trendDown,
  icon,
}: {
  accent?: keyof typeof kpiAccent;
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDown?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[10px] border border-line bg-panel p-3 shadow-card before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.75 md:p-4 ${kpiAccent[accent]}`}
    >
      <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
        {icon && <span className="h-3.5 w-3.5">{icon}</span>}
        {label}
      </div>
      <div className="mt-2 font-display text-[27px] font-semibold tracking-tight">
        {value}
        {unit && <small className="ml-1 text-[13px] font-normal text-muted-2 font-sans">{unit}</small>}
      </div>
      {trend && (
        <div className={`mt-1 font-mono text-[11px] ${trendDown ? "text-red" : "text-green"}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

/* ---------- Page head ---------- */
export function PageHead({
  title,
  desc,
  back,
  primary,
  secondary,
  custom,
}: {
  title: string;
  desc?: string;
} & PageActionsConfig) {
  useRegisterPageActions({ back, primary, secondary, custom });
  return (
    <>
      {/* The topbar (components/topbar.tsx, MODULE_META in lib/data.ts) is now the
          single visible source of the page title AND page actions on every breakpoint.
          Kept sr-only here for a11y / SEO. */}
      <h1 className="sr-only">{title}</h1>
      {desc && <p className="sr-only">{desc}</p>}
    </>
  );
}

/* ---------- Button ---------- */
export const Button = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    variant?: "ink" | "ghost" | "teal" | "danger";
    size?: "md" | "sm";
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ children, variant = "ink", size = "md", className = "", ...props }, ref) {
  const variants = {
    ink: "bg-ink text-panel hover:brightness-125",
    teal: "bg-teal text-white hover:brightness-110",
    ghost: "bg-panel text-ink border border-line hover:bg-bg",
    danger: "bg-red text-white hover:brightness-110",
  };
  const sizes = { md: "px-3.75 py-2.25 text-[13px]", sm: "px-2.75 py-1.5 text-[12px]" };
  return (
    <button
      ref={ref}
      className={`inline-flex items-center gap-1.75 rounded-lg font-medium transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

/* ---------- Segmented control ---------- */
export function Seg({
  options,
  value,
  onChange,
  compact,
}: {
  options: string[];
  value?: number;
  onChange?: (i: number) => void;
  compact?: boolean;
}) {
  const [internal, setInternal] = useState(0);
  const active = value ?? internal;
  const setActive = (i: number) => (onChange ? onChange(i) : setInternal(i));
  return (
    <div className="inline-flex flex-none rounded-lg border border-line bg-bg p-0.75">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => setActive(i)}
          className={`rounded-md font-medium transition ${
            compact ? "px-2 py-1 text-[11px] lg:px-3.25 lg:py-1.5 lg:text-[12.5px]" : "px-3.25 py-1.5 text-[12.5px]"
          } ${active === i ? "bg-panel text-ink shadow-sm" : "text-muted"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ---------- Pagination ---------- */
/**
 * Client-side pagination (ADR-0011). The backend returns whole filtered lists with
 * no `page`/`limit`, so every table slices an already-loaded array. Page number lives
 * in a URL query param so reload / share / back-forward land on the same page.
 */
export const PAGE_SIZE = 12;

export function usePagination<T>(
  items: T[],
  opts: { pageSize?: number; paramKey?: string; resetKey?: string } = {}
) {
  const { pageSize = PAGE_SIZE, paramKey = "page", resetKey } = opts;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawParam = searchParams.get(paramKey);
  const parsed = Math.floor(Number(rawParam));
  const requested = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, totalPages);

  const setPage = useCallback(
    (next: number) => {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      if (next <= 1) sp.delete(paramKey);
      else sp.set(paramKey, String(next));
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, paramKey]
  );

  // clamp an out-of-range ?page= down to the last page (list shrank from filtering)
  useEffect(() => {
    if (rawParam !== null && requested !== page) setPage(page);
  }, [rawParam, requested, page, setPage]);

  // reset to page 1 whenever the caller's filter signature changes (skip first mount)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const start = (page - 1) * pageSize;
  const pageItems = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize]);

  return {
    page,
    totalPages,
    pageItems,
    total: items.length,
    rangeStart: items.length === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, items.length),
    setPage,
  };
}

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function Pagination({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPage,
  unit = "รายการ",
  className = "",
}: {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPage: (page: number) => void;
  unit?: string;
  className?: string;
}) {
  const cell =
    "grid h-7 min-w-7 place-items-center rounded-md border border-line px-1.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const fmt = (n: number) => n.toLocaleString("th-TH");
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 ${className}`}
    >
      <span className="text-[11.5px] text-muted">
        แสดง {fmt(rangeStart)}–{fmt(rangeEnd)} จาก {fmt(total)} {unit}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            className={`${cell} hover:bg-bg`}
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="หน้าก่อนหน้า"
          >
            ‹
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-[12px] text-muted-2">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${cell} ${
                  p === page ? "border-teal bg-teal text-white" : "text-ink hover:bg-bg"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            className={`${cell} hover:bg-bg`}
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            aria-label="หน้าถัดไป"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Form field ---------- */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

const fieldCls =
  "w-full rounded-lg border border-line bg-bg px-2.75 py-2 text-[13px] text-ink outline-none transition focus:border-teal";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

/* ---------- Avatar ---------- */
export function Avatar({ initials, size = "sm" }: { initials: string; size?: "sm" | "xs" }) {
  const s = size === "sm" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  return (
    <span
      className={`inline-grid place-items-center rounded-full bg-gradient-to-br from-[#3a6ea5] to-[#2b4d73] font-display font-semibold text-white ${s}`}
    >
      {initials}
    </span>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({
  points,
  stroke,
  width = 120,
  height = 30,
}: {
  points: number[];
  stroke: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const rng = max - min || 1;
  const step = width / (points.length - 1);
  const poly = points
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / rng) * (height - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-2.5 h-7.5 w-full">
      <polyline points={poly} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  );
}

/* ---------- Timeseries chart (sparkline + x-axis ticks + hover tooltip) ---------- */
export function TimeseriesChart({
  points,
  stroke,
  height = 30,
  tickCount = 4,
  formatTick,
  formatValue,
}: {
  points: { time: string; value: number }[];
  stroke: string;
  height?: number;
  tickCount?: number;
  formatTick: (time: string) => string;
  formatValue: (value: number) => string;
}) {
  const width = 240;
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const rng = max - min || 1;
  const step = width / (points.length - 1);
  const x = (i: number) => i * step;
  const y = (v: number) => height - ((v - min) / rng) * (height - 4) - 2;
  const poly = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const [hover, setHover] = useState<number | null>(null);

  const tickIdx = Array.from(
    new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (points.length - 1)) / (tickCount - 1))))
  );

  return (
    <div className="relative mt-2.5">
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-6.5 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-panel px-1.5 py-0.75 font-mono text-[10px] shadow-card"
          style={{ left: `${(x(hover) / width) * 100}%` }}
        >
          <span className="font-medium text-ink">{formatValue(points[hover].value)}</span>
          <span className="ml-1 text-muted-2">{formatTick(points[hover].time)}</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-7.5 w-full cursor-crosshair"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          setHover(Math.round(frac * (points.length - 1)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <polyline points={poly} fill="none" stroke={stroke} strokeWidth={2} />
        {hover !== null && (
          <>
            <line x1={x(hover)} y1={0} x2={x(hover)} y2={height} stroke={stroke} strokeWidth={1} strokeOpacity={0.3} />
            <circle cx={x(hover)} cy={y(points[hover].value)} r={2.5} fill={stroke} />
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9.5px] text-muted-2">
        {tickIdx.map((idx) => (
          <span key={idx}>{formatTick(points[idx].time)}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Progress ring ---------- */
export function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 flex-none">
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-bg-2)" strokeWidth={4} />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

/* ---------- Donut ---------- */
export function Donut({ items }: { items: { label: string; color: string; value: number }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5 px-1 py-1.5">
      <svg viewBox="0 0 120 120" className="h-27.5 w-27.5 flex-none">
        {items.map((it) => {
          const frac = it.value / total;
          const len = frac * c;
          const off = -acc * c;
          acc += frac;
          return (
            <circle
              key={it.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth={16}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={off}
              transform="rotate(-90 60 60)"
            />
          );
        })}
        <text x="60" y="58" textAnchor="middle" className="fill-ink font-display text-[20px] font-semibold">
          {total >= 100 ? "100" : total}
        </text>
        <text x="60" y="74" textAnchor="middle" className="fill-muted font-mono text-[9px]">
          TOTAL
        </text>
      </svg>
      <div className="flex flex-col gap-2.5 text-[12.5px]">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span className="h-2.75 w-2.75 rounded-[3px]" style={{ background: it.color }} />
            {it.label}
            <span className="ml-auto pl-3.5 font-mono text-muted">{it.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Bar chart (weekly workload) ---------- */
export function BarChart({
  data,
  legendA = "เสร็จสิ้น",
  legendB = "รอทวนสอบ",
}: {
  data: { label: string; a: number; b: number }[];
  legendA?: string;
  legendB?: string;
}) {
  return (
    <>
      <div className="flex h-37.5 items-end gap-3.5 px-1.5 pt-2.5">
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 flex-col justify-end gap-0.5">
              <div className="w-full rounded-t-[3px] bg-amber" style={{ height: d.b }} />
              <div className="w-full rounded-t-[3px] bg-teal" style={{ height: d.a }} />
            </div>
            <div className="font-mono text-[11px] text-muted">{d.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex gap-4.5 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-teal" />
          {legendA}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-amber" />
          {legendB}
        </span>
      </div>
    </>
  );
}

/* ---------- Big area chart (env 24h) ---------- */
export function AreaChart({ points, limit }: { points: number[]; limit?: number }) {
  const pts = points;
  const w = 560;
  const h = 150;
  const pad = 8;
  const values = limit !== undefined ? [...pts, limit] : pts;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = w / (pts.length - 1 || 1);
  const y = (v: number) => pad + (h - 2 * pad) * (1 - (v - min) / span);
  const line = pts.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-37.5 w-full">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-amber)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-amber)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {limit !== undefined && (
          <line x1="0" y1={y(limit)} x2={w} y2={y(limit)} stroke="var(--color-red)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.55} />
        )}
        <polygon points={area} fill="url(#areaGrad)" />
        <polyline points={line} fill="none" stroke="var(--color-amber)" strokeWidth={2.5} strokeLinejoin="round" />
      </svg>
      <div className="mt-0.5 flex justify-between font-mono text-[10.5px] text-muted-2">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>ตอนนี้</span>
      </div>
    </>
  );
}
