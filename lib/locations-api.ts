import { apiFetch } from "@/lib/api-client";
import type { Location } from "@/lib/data";
import { mapLocation, type LocationDTO } from "@/lib/backend-mappers";

/** Shelf-2 before Shelf-10 — the backend sorts children lexicographically. */
export function naturalSort(locations: Location[]): Location[] {
  return [...locations].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

export async function listLocations(parentId?: string): Promise<Location[]> {
  const query = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : "";
  const rows = await apiFetch<LocationDTO[]>(`/locations${query}`);
  return naturalSort(rows.map(mapLocation));
}

export async function createCabinet(name: string): Promise<Location> {
  const created = await apiFetch<LocationDTO>("/locations", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return mapLocation(created);
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
