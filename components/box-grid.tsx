"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import type { Location, Sample } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { gridAxes } from "@/lib/occupancy";
import type { CellMove } from "@/lib/locations-api";

/**
 * The Cell grid of a Box (ADR-0009). Two modes:
 *
 *  - `manage` (Locations module): drag an occupied Cell to move it; ctrl/shift-click
 *    to build a multi-selection, then drag any selected Cell to move the whole group
 *    as one atomic batch via `onMove` (ADR-0010). A single-Cell drag onto an occupied
 *    Cell swaps the two. Plain click on an occupied Cell selects it and calls
 *    `onInspect`; click an empty Cell to put a new sample there (`onPickEmpty`).
 *  - `pick` (put-away): only empty Cells are selectable; picking one calls
 *    `onPickEmpty`. Occupied Cells are shown but disabled. No drag.
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
  onInspect,
}: {
  box: Location;
  occupants: Map<string, Sample>;
  mode?: "manage" | "pick";
  busy?: boolean;
  onPickEmpty?: (position: string) => void;
  onMove?: (moves: CellMove[]) => void;
  onEnlarge?: (rows: number, cols: number) => void;
  onInspect?: (sample: Sample | null) => void;
}) {
  const rows = box.rows ?? 0;
  const cols = box.cols ?? 0;
  const { rowLabels, colLabels } = gridAxes(rows, cols);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [enlarging, setEnlarging] = useState(false);
  const [nextRows, setNextRows] = useState(String(rows));
  const [nextCols, setNextCols] = useState(String(cols));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const used = occupants.size;
  const total = rows * cols;

  // The cells that a drag starting from `activeId` would carry.
  const movingSet = useMemo(() => {
    if (!activeId) return new Set<string>();
    return selected.has(activeId) ? new Set(selected) : new Set([activeId]);
  }, [activeId, selected]);

  const delta = useMemo(() => {
    if (!activeId || !overId) return null;
    const a = parsePos(activeId);
    const o = parsePos(overId);
    if (!a || !o) return null;
    return { dr: o.r - a.r, dc: o.c - a.c };
  }, [activeId, overId]);

  // position -> its projected target while dragging; plus whether the drop is legal.
  const { targets, valid } = useMemo(() => {
    const map = new Map<string, string>();
    if (!delta || movingSet.size === 0) return { targets: map, valid: false };
    let ok = true;
    for (const pos of movingSet) {
      const p = parsePos(pos)!;
      const nr = p.r + delta.dr;
      const nc = p.c + delta.dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) {
        ok = false;
        break;
      }
      map.set(pos, fmtPos(nr, nc));
    }
    if (ok) {
      const single = movingSet.size === 1;
      for (const [, tgt] of map) {
        const occ = occupants.get(tgt);
        if (occ && !movingSet.has(tgt) && !(single && Boolean(occ))) {
          // occupied by a sample not part of the group — only allowed as a 1↔1 swap
          ok = false;
          break;
        }
      }
    }
    return { targets: map, valid: ok };
  }, [delta, movingSet, occupants, rows, cols]);

  const clearDrag = () => {
    setActiveId(null);
    setOverId(null);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragOver = (e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null);

  const handleDragEnd = (_e: DragEndEvent) => {
    if (!valid || !delta || movingSet.size === 0) {
      clearDrag();
      return;
    }
    const moves: CellMove[] = [];
    for (const pos of movingSet) {
      const sample = occupants.get(pos);
      const tgt = targets.get(pos);
      if (sample && tgt) moves.push({ sampleId: sample.id, position: tgt });
    }
    // 1↔1 swap: the displaced sample takes the vacated cell.
    if (movingSet.size === 1) {
      const from = activeId!;
      const tgt = targets.get(from)!;
      const displaced = occupants.get(tgt);
      if (displaced && !movingSet.has(tgt)) moves.push({ sampleId: displaced.id, position: from });
    }
    if (moves.length > 0) onMove?.(moves);
    setSelected(new Set());
    clearDrag();
  };

  const handleClick = (position: string, e: React.MouseEvent) => {
    if (busy) return;
    const occ = occupants.get(position);

    if (mode === "pick") {
      if (!occ) onPickEmpty?.(position);
      return;
    }

    if (!occ) {
      onPickEmpty?.(position);
      return;
    }

    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(position)) next.delete(position);
        else next.add(position);
        return next;
      });
      return;
    }
    setSelected(new Set([position]));
    onInspect?.(occ);
  };

  const submitEnlarge = () => {
    const r = parseInt(nextRows, 10);
    const c = parseInt(nextCols, 10);
    if (!r || !c || r < rows || c < cols || r > 26 || c > 99) return;
    onEnlarge?.(r, c);
    setEnlarging(false);
  };

  const grid = (
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
                return (
                  <td key={position}>
                    <Cell
                      position={position}
                      sample={occ}
                      mode={mode}
                      disabled={busy || (mode === "pick" && Boolean(occ))}
                      selected={selected.has(position)}
                      isMoving={movingSet.has(position)}
                      isDropTarget={overId != null && [...targets.values()].includes(position)}
                      dropValid={valid}
                      onClick={(e) => handleClick(position, e)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] text-muted">
          กริด <span className="font-medium text-ink">{rows}×{cols}</span> · ใช้ไปแล้ว{" "}
          <span className="font-medium text-ink">{used}</span>/{total} ช่อง
          {mode === "manage" && selected.size > 0 && (
            <span className="ml-2 text-teal-d">— เลือก {selected.size} ช่อง ลากเพื่อย้ายทั้งกลุ่ม</span>
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

      {mode === "manage" ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={clearDrag}
        >
          {grid}
          <DragOverlay>
            {activeId ? (
              <div className="grid h-8 min-w-[34px] place-items-center rounded-md border border-teal bg-teal/20 text-[9px] font-mono text-teal-d shadow-lg">
                {movingSet.size > 1 ? `×${movingSet.size}` : activeId}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        grid
      )}

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

function Cell({
  position,
  sample,
  mode,
  disabled,
  selected,
  isMoving,
  isDropTarget,
  dropValid,
  onClick,
}: {
  position: string;
  sample: Sample | undefined;
  mode: "manage" | "pick";
  disabled: boolean;
  selected: boolean;
  isMoving: boolean;
  isDropTarget: boolean;
  dropValid: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const draggable = useDraggable({ id: position, disabled: mode !== "manage" || !sample || disabled });
  const droppable = useDroppable({ id: position, disabled: mode !== "manage" });

  const setRefs = (el: HTMLButtonElement | null) => {
    draggable.setNodeRef(el);
    droppable.setNodeRef(el);
  };

  const cls = [
    "grid h-8 w-full min-w-[34px] place-items-center rounded-md border text-[9px] font-mono transition",
    isDropTarget
      ? dropValid
        ? "border-teal bg-teal/25 text-teal-d ring-1 ring-teal"
        : "border-red bg-red-bg text-red ring-1 ring-red"
      : selected
        ? "border-teal bg-teal/15 text-teal-d ring-1 ring-teal"
        : sample
          ? "border-teal-d/30 bg-teal/10 text-teal-d hover:bg-teal/20"
          : "border-dashed border-line text-muted-2 hover:border-teal hover:text-teal-d",
    isMoving && draggable.isDragging ? "opacity-30" : "",
    disabled ? "cursor-not-allowed opacity-50" : sample && mode === "manage" ? "cursor-grab" : "cursor-pointer",
  ].join(" ");

  return (
    <button
      ref={setRefs}
      {...draggable.attributes}
      {...draggable.listeners}
      title={sample ? `${position} · ${sample.id} — ${sample.name}` : position}
      onClick={onClick}
      disabled={disabled}
      className={cls}
    >
      {sample ? sample.id.slice(-4) : ""}
    </button>
  );
}

function parsePos(pos: string): { r: number; c: number } | null {
  const m = /^([A-Za-z]+)(\d+)$/.exec(pos);
  if (!m) return null;
  return { r: m[1].toUpperCase().charCodeAt(0) - 65, c: parseInt(m[2], 10) - 1 };
}

function fmtPos(r: number, c: number): string {
  return `${String.fromCharCode(65 + r)}${c + 1}`;
}
