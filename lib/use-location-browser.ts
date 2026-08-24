import { useCallback, useEffect, useState } from "react";
import type { Location } from "@/lib/data";
import { listLocations } from "@/lib/locations-api";

/**
 * Drill-down state for browsing the Location tree one level at a time,
 * mirroring the backend's non-recursive `?parent_id=` contract. `path`
 * holds the ancestor chain from the root down to the level being viewed —
 * it doubles as the full path, so no extra full-path fetch is needed while browsing.
 */
export function useLocationBrowser() {
  const [path, setPath] = useState<Location[]>([]);
  const [children, setChildren] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parentId = path.length > 0 ? path[path.length - 1].id : undefined;

  const load = useCallback(async (id: string | undefined) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listLocations(id);
      setChildren(rows);
    } catch {
      setError("โหลดรายการ location ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(parentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const refresh = useCallback(() => load(parentId), [load, parentId]);

  /** Fetches `node`'s children and drills into it, returning them so callers can decide (e.g. treat an empty result as a leaf). */
  const enter = useCallback(async (node: Location): Promise<Location[]> => {
    const rows = await listLocations(node.id);
    setPath((prev) => [...prev, node]);
    setChildren(rows);
    return rows;
  }, []);

  const goToRoot = useCallback(() => setPath([]), []);
  const goToCrumb = useCallback((index: number) => setPath((prev) => prev.slice(0, index + 1)), []);

  return { path, children, loading, error, enter, goToRoot, goToCrumb, refresh };
}
