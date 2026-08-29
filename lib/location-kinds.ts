import type { LevelType, LocationKind } from "@/lib/data";

/**
 * Per-Kind facts about the two Location trees (ADR-0008). Nothing may infer a
 * level's meaning or depth from its name alone: `cabinet` is the root of the
 * sample tree but sits at depth 4 in the equipment tree, so every level
 * question goes through this config.
 */
interface KindConfig {
  /** Human name of the tree itself, e.g. for the tab that switches between them. */
  label: string;
  /** Fixed level hierarchy, root first — mirrors the backend's `hierarchies` map. */
  levels: LevelType[];
  levelLabel: Record<string, string>;
}

export const LOCATION_KINDS: Record<LocationKind, KindConfig> = {
  sample_storage: {
    label: "ตำแหน่งตัวอย่าง",
    levels: ["cabinet", "shelf", "slot", "sub_slot"],
    levelLabel: { cabinet: "ตู้", shelf: "ชั้น", slot: "ช่อง", sub_slot: "Sub-ช่อง", box: "กล่อง" },
  },
  equipment_storage: {
    label: "ตำแหน่งเครื่องมือ & คลัง",
    levels: ["building", "room", "zone", "cabinet", "shelf"],
    levelLabel: { building: "อาคาร", room: "ห้อง", zone: "โซน", cabinet: "ตู้", shelf: "ชั้น" },
  },
};

export function levelLabel(kind: LocationKind, level: LevelType): string {
  return LOCATION_KINDS[kind].levelLabel[level] ?? level;
}

/** The level a root (parentless) node of this tree must have — "ตู้" here, "อาคาร" there. */
export function rootLevel(kind: LocationKind): LevelType {
  return LOCATION_KINDS[kind].levels[0];
}

export function rootLabel(kind: LocationKind): string {
  return levelLabel(kind, rootLevel(kind));
}

/** True when `level` is the bottom rung of its tree and cannot be subdivided further. */
export function isDeepestLevel(kind: LocationKind, level: LevelType): boolean {
  const levels = LOCATION_KINDS[kind].levels;
  return levels[levels.length - 1] === level;
}

/** Label of the level one rung below `level`, or null when there is none. */
export function childLevelLabel(kind: LocationKind, level: LevelType): string | null {
  const levels = LOCATION_KINDS[kind].levels;
  const next = levels[levels.indexOf(level) + 1];
  return next ? levelLabel(kind, next) : null;
}

/**
 * True when a Box may hang directly off a node at `level` (ADR-0009) — mirrors the
 * backend's `CanParentBox`: only the sample tree, only Shelf / Slot / Sub-slot.
 */
export function canHoldBox(kind: LocationKind, level: LevelType): boolean {
  return kind === "sample_storage" && (level === "shelf" || level === "slot" || level === "sub_slot");
}

/** A Box is terminal — it stores samples by Cell, never has child Locations. */
export function isBoxLevel(level: LevelType): boolean {
  return level === "box";
}
