"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Recharts-backed charts (ADR-0018). Public props are kept identical to the
 * hand-rolled SVG versions they replaced so pages didn't have to change.
 * Colors are passed as CSS vars (`var(--color-teal)`) so light/dark theming
 * keeps working without reading the theme in JS.
 */

const AXIS_TICK = { fontSize: 9.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-mono, monospace)" };
const TOOLTIP_CLASS =
  "pointer-events-none whitespace-nowrap rounded-md border border-line bg-panel px-2 py-1 font-mono text-[10.5px] shadow-card";

/** ResponsiveContainer measures 0x0 during SSR/first paint - render the chart only after mount. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function ChartBox({ height, children }: { height: number; children: ReactNode }) {
  const mounted = useMounted();
  return (
    <div style={{ height }} className="w-full">
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ---------- Timeseries chart (sparkline, or axes + grid with `showAxes`) ---------- */
export function TimeseriesChart({
  points,
  stroke,
  height = 30,
  tickCount = 4,
  showAxes = false,
  formatTick,
  formatValue,
}: {
  points: { time: string; value: number }[];
  stroke: string;
  height?: number;
  tickCount?: number;
  /** Y axis + grid + time axis in the same style as HistoryChart; default is the bare sparkline. */
  showAxes?: boolean;
  formatTick: (time: string) => string;
  formatValue: (value: number) => string;
}) {
  const rows = points.map((p) => ({ ...p, t: new Date(p.time).getTime() }));
  const tMin = rows[0].t;
  const tMax = rows[rows.length - 1].t;
  // evenly spaced ticks - Recharts ignores `tickCount` on a numeric time axis (see HistoryChart)
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round(tMin + (i * (tMax - tMin)) / Math.max(1, tickCount - 1))
  );
  const sparkTickIdx = Array.from(
    new Set(
      Array.from({ length: tickCount }, (_, i) => Math.round((i * (points.length - 1)) / Math.max(1, tickCount - 1)))
    )
  );
  return (
    <div className="mt-2.5">
      <ChartBox height={height}>
        <LineChart data={rows} margin={showAxes ? { top: 6, right: 8, bottom: 0, left: 0 } : { top: 2, right: 2, bottom: 2, left: 2 }}>
          {showAxes && <CartesianGrid vertical={false} stroke="var(--color-line)" strokeOpacity={0.7} />}
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            hide={!showAxes}
            ticks={ticks}
            tickFormatter={(v: number) => formatTick(new Date(v).toISOString())}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            padding={{ left: 12, right: 12 }}
            minTickGap={30}
          />
          <YAxis
            hide={!showAxes}
            domain={
              showAxes
                ? // keep at least 1 unit of span so a near-flat series doesn't produce duplicate tick labels (31.3, 31.3, 31.2)
                  ([lo, hi]: readonly [number, number]): [number, number] =>
                    hi - lo >= 1 ? [lo, hi] : [(lo + hi) / 2 - 0.5, (lo + hi) / 2 + 0.5]
                : ["dataMin", "dataMax"]
            }
            tickFormatter={formatValue}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            isAnimationActive={false}
            allowEscapeViewBox={{ x: false, y: true }}
            position={{ y: showAxes ? -4 : -30 }}
            cursor={{ stroke: showAxes ? "var(--color-muted-2)" : stroke, strokeOpacity: showAxes ? 0.6 : 0.3 }}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as { time: string; value: number } | undefined) : undefined;
              if (!p) return null;
              return (
                <div className={TOOLTIP_CLASS}>
                  <span className="font-medium text-ink">{formatValue(p.value)}</span>
                  <span className="ml-1 text-muted-2">{formatTick(p.time)}</span>
                </div>
              );
            }}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: showAxes ? 3 : 2.5, fill: stroke, stroke: stroke }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartBox>
      {!showAxes && (
        <div className="mt-1 flex justify-between font-mono text-[9.5px] text-muted-2">
          {sparkTickIdx.map((idx) => (
            <span key={idx}>{formatTick(points[idx].time)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- History chart (multi-series avg line + min/max band, x by real time) ---------- */
export interface HistorySeries {
  key: string;
  label: string;
  color: string;
  points: { time: string; avg: number; min: number; max: number }[];
}

type HistoryRow = { t: number } & Record<string, number | number[]>;

export function HistoryChart({
  series,
  height = 180,
  tickCount = 5,
  formatTick,
  formatValue,
}: {
  series: HistorySeries[];
  height?: number;
  tickCount?: number;
  formatTick: (time: string) => string;
  formatValue: (value: number) => string;
}) {
  // one row per timestamp; each series contributes `<key>_avg` and `<key>_range` ([min,max]) columns
  const rows = useMemo(() => {
    const byTime = new Map<number, HistoryRow>();
    for (const s of series) {
      for (const p of s.points) {
        const t = new Date(p.time).getTime();
        const row = byTime.get(t) ?? ({ t } as HistoryRow);
        row[`${s.key}_avg`] = p.avg;
        row[`${s.key}_range`] = [p.min, p.max];
        byTime.set(t, row);
      }
    }
    return Array.from(byTime.values()).sort((a, b) => a.t - b.t);
  }, [series]);

  if (rows.length < 2) return null;
  const iso = (t: number) => new Date(t).toISOString();
  // Recharts ignores `tickCount` on a numeric time axis (it picked ~hourly ticks), so pass evenly spaced ticks explicitly.
  const tMin = rows[0].t;
  const tMax = rows[rows.length - 1].t;
  const ticks = Array.from({ length: tickCount }, (_, i) => Math.round(tMin + (i * (tMax - tMin)) / (tickCount - 1)));

  return (
    <div>
      <ChartBox height={height}>
        <ComposedChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeOpacity={0.7} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={(v: number) => formatTick(iso(v))}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            padding={{ left: 16, right: 16 }}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={formatValue}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: "var(--color-muted-2)", strokeOpacity: 0.6 }}
            content={({ active, payload }) => {
              const row = active ? (payload?.[0]?.payload as HistoryRow | undefined) : undefined;
              if (!row) return null;
              return (
                <div className={TOOLTIP_CLASS}>
                  <div className="text-muted-2">{formatTick(iso(row.t))}</div>
                  {series.map((s) => {
                    const avg = row[`${s.key}_avg`] as number | undefined;
                    const range = row[`${s.key}_range`] as number[] | undefined;
                    if (avg === undefined || !range) return null;
                    return (
                      <div key={s.key} style={{ color: s.color }}>
                        {s.label} {formatValue(avg)}{" "}
                        <span className="text-muted-2">
                          ({formatValue(range[0])}–{formatValue(range[1])})
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Area
              key={`${s.key}_range`}
              dataKey={`${s.key}_range`}
              type="linear"
              stroke="none"
              fill={s.color}
              fillOpacity={0.12}
              connectNulls
              isAnimationActive={false}
              activeDot={false}
            />
          ))}
          {series.map((s) => (
            <Line
              key={`${s.key}_avg`}
              dataKey={`${s.key}_avg`}
              type="linear"
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: s.color, stroke: s.color }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ChartBox>
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Donut ---------- */
export function Donut({ items }: { items: { label: string; color: string; value: number }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const data = items.map((i) => ({ ...i, fill: i.color }));
  return (
    <div className="flex items-center gap-5 px-1 py-1.5">
      <div className="relative h-27.5 w-27.5 flex-none">
        <PieChart width={110} height={110}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={32}
            outerRadius={50}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <div className="font-display text-[20px] font-semibold leading-none text-ink">
            {total >= 100 ? "100" : total}
          </div>
          <div className="mt-1 font-mono text-[9px] text-muted">TOTAL</div>
        </div>
      </div>
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

/* ---------- Stacked bar chart (weekly workload) ---------- */
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
      <div className="px-1.5 pt-2.5">
        <ChartBox height={150}>
          <RBarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
            <XAxis
              dataKey="label"
              tick={{ ...AXIS_TICK, fontSize: 11, fill: "var(--color-muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: "var(--color-bg-2)", fillOpacity: 0.5 }}
              content={({ active, payload }) => {
                const d = active ? (payload?.[0]?.payload as { label: string; a: number; b: number } | undefined) : undefined;
                if (!d) return null;
                return (
                  <div className={TOOLTIP_CLASS}>
                    <div className="text-muted-2">{d.label}</div>
                    <div className="text-teal">
                      {legendA} {d.a}
                    </div>
                    <div className="text-amber">
                      {legendB} {d.b}
                    </div>
                  </div>
                );
              }}
            />
            {/* both segments get rounded tops + a panel-colored stroke as the 2px gap, like the original stacked divs */}
            <Bar
              dataKey="a"
              stackId="v"
              fill="var(--color-teal)"
              stroke="var(--color-panel)"
              strokeWidth={1}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="b"
              stackId="v"
              fill="var(--color-amber)"
              stroke="var(--color-panel)"
              strokeWidth={1}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </RBarChart>
        </ChartBox>
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
