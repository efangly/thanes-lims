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

/* Charts live in components/charts.tsx (Recharts, ADR-0018); re-exported so imports from "@/components/ui" keep working. */
export { BarChart, Donut, HistoryChart, TimeseriesChart, type HistorySeries } from "@/components/charts";
