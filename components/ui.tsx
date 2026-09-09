"use client";

import { forwardRef, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Tag as TagType, TagTone } from "@/lib/data";

/* ---------- Tag / status label-chip ----------
   A specimen-label chip: hairline border, transparent ground, mono caps,
   a leading square marker in the tone colour. Not a filled pill. */
const toneMap: Record<TagTone, string> = {
  accent: "text-accent-d border-accent-d/35",
  amber: "text-amber border-amber/35",
  red: "text-red border-red/35",
  green: "text-green border-green/35",
  grey: "text-muted border-line-2",
};

export function Tag({ tone, label }: TagType) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border bg-transparent px-1.5 py-[2px] font-mono text-[10.5px] font-medium uppercase tracking-[0.4px] whitespace-nowrap ${toneMap[tone]}`}
    >
      <span className="h-[6px] w-[6px] flex-none bg-current" />
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
    <div className={`rounded border border-line bg-panel ${className}`}>
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
    <div className="flex items-center justify-between border-b border-line px-[18px] py-[15px]">
      <h3 className="flex items-center gap-2.5 font-display text-[15px] font-semibold">
        {icon && <span className="h-[17px] w-[17px] text-accent-d">{icon}</span>}
        {title}
      </h3>
      {right}
    </div>
  );
}

/* ---------- KPI card ---------- */
const kpiAccent: Record<string, string> = {
  accent: "before:bg-accent",
  amber: "before:bg-amber",
  red: "before:bg-red",
  green: "before:bg-green",
  grey: "before:bg-line-2",
};

export function KpiCard({
  accent = "accent",
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
      className={`relative overflow-hidden rounded border border-line bg-panel p-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] ${kpiAccent[accent]}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.5px] text-muted">
        {icon && <span className="h-3.5 w-3.5">{icon}</span>}
        {label}
      </div>
      <div className="mt-2 font-mono text-[24px] font-medium tracking-tight">
        {value}
        {unit && <small className="ml-1 font-sans text-[13px] font-normal text-muted-2">{unit}</small>}
      </div>
      {trend && (
        <div className={`mt-1 font-mono text-[11px] ${trendDown ? "text-red" : "text-green"}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

/* ---------- Readout strip ----------
   Instrument-style metric row: a single hairline-ruled band of label / value
   pairs sitting at the top of a work area. Replaces the KPI card grid inside
   the 3-panel layout (ADR-0012). */
export function ReadoutStrip({
  items,
  className = "",
}: {
  items: { label: string; value: string; unit?: string; tone?: "amber" | "red" | "green" }[];
  className?: string;
}) {
  const toneText: Record<string, string> = {
    amber: "text-amber",
    red: "text-red",
    green: "text-green",
  };
  return (
    <div
      className={`flex flex-wrap items-stretch divide-x divide-line border-b border-line ${className}`}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5 px-4 py-2 first:pl-0">
          <span className="text-[10px] uppercase tracking-[0.6px] text-muted-2">{it.label}</span>
          <span className={`font-mono text-[15px] font-medium ${it.tone ? toneText[it.tone] : "text-ink"}`}>
            {it.value}
            {it.unit && <span className="ml-1 text-[11px] text-muted-2">{it.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Page head ---------- */
export function PageHead({
  title,
  desc,
  actions,
}: {
  title: string;
  desc: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-display text-[21px] font-semibold">{title}</div>
        <div className="mt-[3px] max-w-[640px] text-[13px] text-muted">{desc}</div>
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  );
}

/* ---------- Button ---------- */
export const Button = forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    variant?: "ink" | "ghost" | "accent" | "danger";
    size?: "md" | "sm";
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ children, variant = "ink", size = "md", className = "", ...props }, ref) {
  const variants = {
    ink: "bg-ink text-panel hover:bg-ink-2",
    accent: "bg-accent text-white hover:bg-accent-d",
    ghost: "bg-panel text-ink border border-line-2 hover:bg-bg-2",
    danger: "bg-red text-white hover:brightness-95",
  };
  const sizes = { md: "px-[15px] py-[9px] text-[13px]", sm: "px-[11px] py-1.5 text-[12px]" };
  return (
    <button
      ref={ref}
      className={`inline-flex items-center gap-[7px] rounded font-medium transition active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`}
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
}: {
  options: string[];
  value?: number;
  onChange?: (i: number) => void;
}) {
  const [internal, setInternal] = useState(0);
  const active = value ?? internal;
  const setActive = (i: number) => (onChange ? onChange(i) : setInternal(i));
  return (
    <div className="inline-flex rounded border border-line bg-bg p-[2px]">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => setActive(i)}
          className={`rounded-[2px] px-[13px] py-1.5 text-[12.5px] font-medium transition ${
            active === i ? "bg-panel text-ink ring-1 ring-line-2" : "text-muted hover:text-ink"
          }`}
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
    "grid h-7 min-w-7 place-items-center rounded-[2px] border border-line px-1.5 font-mono text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
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
                  p === page ? "border-ink bg-ink text-panel" : "text-ink hover:bg-bg-2"
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
  "w-full rounded border border-line-2 bg-panel px-[11px] py-2 text-[13px] text-ink outline-none transition focus:border-ink focus:outline focus:outline-1 focus:outline-ink";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldCls} ${props.className ?? ""}`} />;
}

/* ---------- Avatar ---------- */
export function Avatar({ initials, size = "sm" }: { initials: string; size?: "sm" | "xs" }) {
  const s = size === "sm" ? "h-8 w-8 text-[11px]" : "h-6 w-6 text-[9px]";
  return (
    <span
      className={`inline-grid place-items-center rounded bg-ink font-mono font-medium text-panel ${s}`}
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
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="mt-2.5 h-[30px] w-full">
      <polyline points={poly} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
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
      <svg viewBox="0 0 120 120" className="h-[110px] w-[110px] flex-none">
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
            <span className="h-[11px] w-[11px] rounded-[3px]" style={{ background: it.color }} />
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
      <div className="flex h-[150px] items-end gap-3.5 px-1.5 pt-2.5">
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 flex-col justify-end gap-0.5">
              <div className="w-full rounded-t-[3px] bg-amber" style={{ height: d.b }} />
              <div className="w-full rounded-t-[3px] bg-accent" style={{ height: d.a }} />
            </div>
            <div className="font-mono text-[11px] text-muted">{d.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex gap-[18px] text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" />
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
export function AreaChart() {
  const pts = [4, 4.2, 4, 4.5, 4.3, 4.8, 5.2, 6.1, 6.9, 6.6, 6.2, 5.8, 5.4, 5, 4.6, 4.4];
  const w = 560;
  const h = 150;
  const max = 8;
  const min = 2;
  const step = w / (pts.length - 1);
  const line = pts.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / (max - min)) * h).toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const limitY = h - ((8 - min) / (max - min)) * h;
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[150px] w-full">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-amber)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-amber)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={limitY} x2={w} y2={limitY} stroke="var(--color-red)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.55} />
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
