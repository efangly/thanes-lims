"use client";

import { type ReactNode, useState } from "react";
import type { Tag as TagType, TagTone } from "@/lib/data";

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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-medium font-mono whitespace-nowrap ${t.bg} ${t.text}`}
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
    <div className="flex items-center justify-between border-b border-line px-[18px] py-[15px]">
      <h3 className="flex items-center gap-2.5 font-display text-[15px] font-semibold">
        {icon && <span className="h-[17px] w-[17px] text-teal-d">{icon}</span>}
        {title}
      </h3>
      {right}
    </div>
  );
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
      className={`relative overflow-hidden rounded-[10px] border border-line bg-panel p-4 shadow-card before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] ${kpiAccent[accent]}`}
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
  actions,
}: {
  title: string;
  desc: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-display text-[22px] font-semibold tracking-[-0.2px]">{title}</div>
        <div className="mt-[3px] max-w-[640px] text-[13px] text-muted">{desc}</div>
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  );
}

/* ---------- Button ---------- */
export function Button({
  children,
  variant = "ink",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "ink" | "ghost" | "teal";
  size?: "md" | "sm";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    ink: "bg-ink text-panel hover:brightness-125",
    teal: "bg-teal text-white hover:brightness-110",
    ghost: "bg-panel text-ink border border-line hover:bg-bg",
  };
  const sizes = { md: "px-[15px] py-[9px] text-[13px]", sm: "px-[11px] py-1.5 text-[12px]" };
  return (
    <button
      className={`inline-flex items-center gap-[7px] rounded-lg font-medium transition active:translate-y-px ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

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
    <div className="inline-flex rounded-lg border border-line bg-bg p-[3px]">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => setActive(i)}
          className={`rounded-md px-[13px] py-1.5 text-[12.5px] font-medium transition ${
            active === i ? "bg-panel text-ink shadow-sm" : "text-muted"
          }`}
        >
          {o}
        </button>
      ))}
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
  "w-full rounded-lg border border-line bg-bg px-[11px] py-2 text-[13px] text-ink outline-none transition focus:border-teal";

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
export function BarChart({ data }: { data: { label: string; a: number; b: number }[] }) {
  return (
    <>
      <div className="flex h-[150px] items-end gap-3.5 px-1.5 pt-2.5">
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
      <div className="mt-3.5 flex gap-[18px] text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-teal" />
          เสร็จสิ้น
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-amber" />
          รอทวนสอบ
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
