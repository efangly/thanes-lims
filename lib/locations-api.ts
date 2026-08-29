import { apiFetch } from "@/lib/api-client";
import type { Location, LocationKind } from "@/lib/data";
import { mapLocation, type LocationDTO } from "@/lib/backend-mappers";

/** Shelf-2 before Shelf-10 — the backend sorts children lexicographically. */
export function naturalSort(locations: Location[]): Location[] {
  return [...locations].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

/**
 * Direct children of `parentId`, or the roots of `kind`'s tree when it is omitted.
 * `kind` only matters for a root listing (children inherit their parent's tree) but
 * is always passed rather than relying on the backend's sample_storage default —
 * there are two trees now, so nothing should have an implicit one (ADR-0008).
 */
export async function listLocations(parentId?: string, kind: LocationKind = "sample_storage"): Promise<Location[]> {
  const query = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : `?kind=${kind}`;
  const rows = await apiFetch<LocationDTO[]>(`/locations${query}`);
  return naturalSort(rows.map(mapLocation));
}

/** Creates a root node — a Cabinet in the sample tree, a Building in the equipment tree. */
export async function createRoot(name: string, kind: LocationKind = "sample_storage"): Promise<Location> {
  const created = await apiFetch<LocationDTO>("/locations", {
    method: "POST",
    body: JSON.stringify({ name, kind }),
  });
  return mapLocation(created);
}

/** One Location by id — used to resolve a deep-linked node (e.g. a Box, whose Grid the drill-down doesn't carry). */
export async function getLocation(id: string): Promise<Location> {
  return mapLocation(await apiFetch<LocationDTO>(`/locations/${encodeURIComponent(id)}`));
}

/** Resolves a scanned Location Barcode to its node. Throws ApiError `not_found` when the code is unknown. */
export async function lookupLocationByBarcode(code: string): Promise<Location> {
  const found = await apiFetch<LocationDTO>(`/locations/by-barcode/${encodeURIComponent(code)}`);
  return mapLocation(found);
}

export async function generateChildren(parentId: string, prefix: string, count: number): Promise<Location[]> {
  const created = await apiFetch<LocationDTO[]>(`/locations/${parentId}/children`, {
    method: "POST",
    body: JSON.stringify({ prefix, count }),
  });
  return naturalSort(created.map(mapLocation));
}

/**
 * Creates a Box (a `level_type: "box"` Location with a Grid) under `parentId`,
 * which must be a Shelf, Slot, or Sub-slot (ADR-0009). A Box never has child
 * Locations — it holds samples by Cell position.
 */
export async function createBox(parentId: string, name: string, rows: number, cols: number): Promise<Location> {
  const created = await apiFetch<LocationDTO>(`/locations/${parentId}/boxes`, {
    method: "POST",
    body: JSON.stringify({ name, rows, cols }),
  });
  return mapLocation(created);
}

/** Grows a Box's Grid. The backend rejects any shrink — `rows`/`cols` must be ≥ current. */
export async function enlargeBox(boxId: string, rows: number, cols: number): Promise<Location> {
  const updated = await apiFetch<LocationDTO>(`/locations/${boxId}/grid`, {
    method: "PATCH",
    body: JSON.stringify({ rows, cols }),
  });
  return mapLocation(updated);
}

export interface CellMove {
  sampleId: string;
  position: string;
}

/**
 * Rearranges Cells inside one Box as a single atomic batch (ADR-0009): a drag of
 * a multi-selection or a two-Cell swap either all lands or none does. A position
 * clash fails the whole batch with 409. Moving a sample in from another box is
 * ordinary put-away, not this.
 */
export async function moveWithinBox(boxId: string, moves: CellMove[]): Promise<void> {
  await apiFetch<{ sample_id: string; position: string }[]>(`/locations/${boxId}/moves`, {
    method: "POST",
    body: JSON.stringify({ moves: moves.map((m) => ({ sample_id: m.sampleId, position: m.position })) }),
  });
}

export async function deleteLocation(id: string): Promise<void> {
  await apiFetch<void>(`/locations/${id}`, { method: "DELETE" });
}

export async function getFullPath(id: string): Promise<string> {
  const res = await apiFetch<{ full_path: string }>(`/locations/${id}/full-path`);
  return res.full_path;
}
