import type { Sample } from "@/lib/data";

/**
 * A handed-over sample no longer "occupies" its old leaf even though its
 * `locationId` still points there until it is stored somewhere new.
 */
export const TRANSFERRED_LABEL = "ส่งต่อแผนก";

/** The sample currently holding `locationId`, if any. Only the sample tree tracks this. */
export function occupantOf(samples: Sample[], locationId: string): Sample | undefined {
  return samples.find((s) => s.locationId === locationId && s.status.label !== TRANSFERRED_LABEL);
}
