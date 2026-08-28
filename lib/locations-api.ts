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

export async function deleteLocation(id: string): Promise<void> {
  await apiFetch<void>(`/locations/${id}`, { method: "DELETE" });
}

export async function getFullPath(id: string): Promise<string> {
  const res = await apiFetch<{ full_path: string }>(`/locations/${id}/full-path`);
  return res.full_path;
}
