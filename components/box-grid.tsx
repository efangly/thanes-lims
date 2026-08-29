"use client";

import { useState } from "react";
import Link from "next/link";
import type { Location, Sample } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { gridAxes } from "@/lib/occupancy";
import type { CellMove } from "@/lib/locations-api";

/**
 * The Cell grid of a Box (ADR-0009). Two modes:
 *
 *  - `manage` (Locations module): shows which Cells are taken; click an occupied
 *    Cell then another Cell to move (or swap) — applied as one atomic batch via
 *    `onMove`. Click an empty Cell to put a new sample there (`onPickEmpty`).
 *  - `pick` (put-away): only empty Cells are selectable; picking one calls
 *    `onPickEmpty`. Occupied Cells are shown but disabled.
 *
 * A Box only grows, so `onEnlarge` (manage mode) opens a rows/cols prompt.
 */
export function BoxGrid({
  box,
  occupants,
  mode = "manage",
  busy = false,
  onPickEmpty,
  onMove,
  onEnlarge,
}: {
  box: Location;
  occupants: Map<string, Sample>;
  mode?: "manage" | "pick";
  busy?: boolean;
  onPickEmpty?: (position: string) => void;
  onMove?: (moves: CellMove[]) => void;
  onEnlarge?: (rows: number, cols: number) => void;
}) {
  const rows = box.rows ?? 0;
  const cols = box.cols ?? 0;
  const { rowLabels, colLabels } = gridAxes(rows, cols);
  const [selected, setSelected] = useState<string | null>(null);
  const [enlarging, setEnlarging] = useState(false);
  const [nextRows, setNextRows] = useState(String(rows));
  const [nextCols, setNextCols] = useState(String(cols));

  const used = occupants.size;
  const total = rows * cols;

  const handleCell = (position: string) => {
    if (busy) return;
    const occ = occupants.get(position);

    if (mode === "pick") {
      if (occ) return;
      onPickEmpty?.(position);
      return;
    }

    // manage mode
    if (!selected) {
      if (occ) setSelected(position);
      else onPickEmpty?.(position);
      return;
    }
    if (selected === position) {
      setSelected(null);
      return;
    }
    const from = occupants.get(selected);
    if (!from) {
      setSelected(null);
      return;
    }
    const moves: CellMove[] = [{ sampleId: from.id, position }];
    if (occ) moves.push({ sampleId: occ.id, position: selected });
    onMove?.(moves);
    setSelected(null);
  };

  const submitEnlarge = () => {
    const r = parseInt(nextRows, 10);
    const c = parseInt(nextCols, 10);
    if (!r || !c || r < rows || c < cols || r > 26 || c > 99) return;
    onEnlarge?.(r, c);
    setEnlarging(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] text-muted">
          กริด <span className="font-medium text-ink">{rows}×{cols}</span> · ใช้ไปแล้ว{" "}
          <span className="font-medium text-ink">{used}</span>/{total} ช่อง
          {mode === "manage" && selected && (
            <span className="ml-2 text-teal-d">— เลือก {selected} แล้ว คลิกช่องปลายทางเพื่อย้าย/สลับ</span>
          )}
        </div>
        {mode === "manage" && onEnlarge && !enlarging && (
          <button
            onClick={() => setEnlarging(true)}
            className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[12px] text-muted transition hover:bg-bg"
          >
            <Icons.Plus className="h-3 w-3" />
            ขยายกริด
          </button>
        )}
      </div>

      {enlarging && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-bg px-3 py-2.5">
          <label className="flex flex-col gap-1 text-[11px] text-muted">
            แถว (≤ 26)
            <input
              type="number"
              min={rows}
              max={26}
              value={nextRows}
              onChange={(e) => setNextRows(e.target.value)}
              className="w-20 rounded-md border border-line bg-panel px-2 py-1 text-[13px] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted">
            คอลัมน์ (≤ 99)
            <input
              type="number"
              min={cols}
              max={99}
              value={nextCols}
              onChange={(e) => setNextCols(e.target.value)}
              className="w-20 rounded-md border border-line bg-panel px-2 py-1 text-[13px] text-ink"
            />
          </label>
          <button
            onClick={submitEnlarge}
            disabled={busy}
            className="rounded-md bg-teal px-2.5 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            บันทึก
          </button>
          <button onClick={() => setEnlarging(false)} className="px-2 py-1.5 text-[12px] text-muted">
            ยกเลิก
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-6" />
              {colLabels.map((c) => (
                <th key={c} className="min-w-[34px] pb-0.5 text-center font-mono text-[10px] font-medium text-muted-2">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((r) => (
              <tr key={r}>
                <td className="pr-0.5 text-center font-mono text-[10px] font-medium text-muted-2">{r}</td>
                {colLabels.map((c) => {
                  const position = `${r}${c}`;
                  const occ = occupants.get(position);
                  const isSel = selected === position;
                  const disabled = busy || (mode === "pick" && Boolean(occ));
                  return (
                    <td key={position}>
                      <button
                        title={occ ? `${position} · ${occ.id} — ${occ.name}` : position}
                        onClick={() => handleCell(position)}
                        disabled={disabled}
                        className={[
                          "grid h-8 w-full min-w-[34px] place-items-center rounded-md border text-[9px] font-mono transition",
                          isSel
                            ? "border-teal bg-teal/15 text-teal-d ring-1 ring-teal"
                            : occ
                              ? "border-teal-d/30 bg-teal/10 text-teal-d hover:bg-teal/20"
                              : "border-dashed border-line text-muted-2 hover:border-teal hover:text-teal-d",
                          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                        ].join(" ")}
                      >
                        {occ ? occ.id.slice(-4) : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mode === "manage" && used > 0 && (
        <ul className="flex flex-col gap-1 text-[11.5px]">
          {[...occupants.entries()]
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
            .map(([pos, s]) => (
              <li key={pos} className="flex items-center gap-2">
                <span className="font-mono text-muted-2">{pos}</span>
                <Link href={`/samples?s=${s.id}`} className="font-mono text-teal-d hover:underline">
                  {s.id}
                </Link>
                <span className="truncate text-muted">{s.name}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
