import type { Sample } from "@/lib/data";

/**
 * A handed-over sample no longer "occupies" its old leaf even though its
 * `locationId` still points there until it is stored somewhere new.
 */
export const TRANSFERRED_LABEL = "ส่งต่อแผนก";

/** True while the sample is still physically present (not handed over to another dept). */
function isActive(s: Sample): boolean {
  return s.status.label !== TRANSFERRED_LABEL;
}

/** The sample currently holding `locationId`, if any. Only the sample tree tracks this. */
export function occupantOf(samples: Sample[], locationId: string): Sample | undefined {
  return samples.find((s) => s.locationId === locationId && isActive(s));
}

/** The active samples in a Box, keyed by their Cell position (ADR-0009). */
export function boxOccupants(samples: Sample[], boxId: string): Map<string, Sample> {
  const byCell = new Map<string, Sample>();
  for (const s of samples) {
    if (s.locationId === boxId && s.position && isActive(s)) byCell.set(s.position, s);
  }
  return byCell;
}

/** The active sample in one Cell of a Box, if any. */
export function cellOccupant(samples: Sample[], boxId: string, position: string): Sample | undefined {
  return samples.find((s) => s.locationId === boxId && s.position === position && isActive(s));
}

/** `["A","B",...]` up to `rows` (max 26) and `[1,2,...]` up to `cols` — Box Grid axes. */
export function gridAxes(rows: number, cols: number): { rowLabels: string[]; colLabels: number[] } {
  return {
    rowLabels: Array.from({ length: Math.min(rows, 26) }, (_, i) => String.fromCharCode(65 + i)),
    colLabels: Array.from({ length: cols }, (_, i) => i + 1),
  };
}
