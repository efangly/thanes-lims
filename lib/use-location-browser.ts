import { useCallback, useEffect, useState } from "react";
import type { Location } from "@/lib/data";
import { getFullPath, listLocations } from "@/lib/locations-api";

/**
 * Drill-down state for browsing the Location tree one level at a time,
 * mirroring the backend's non-recursive `?parent_id=` contract. `path`
 * holds the ancestor chain from the root down to the level being viewed —
 * it doubles as the full path, so no extra full-path fetch is needed while browsing.
 *
 * `routeId` (the `/locations/[id]` route param, if any) keeps `path` in sync with
 * the URL: on a fresh visit to an id already in `path` (browser back/forward to an
 * ancestor visited this session) it's just truncated; otherwise (deep link, hard
 * refresh) there's no backend "ancestors of id" endpoint to rebuild the full chain
 * from, so `path` becomes a single synthetic node built from `getFullPath`, and the
 * unresolved ancestor names are exposed as `ancestorLabel` (plain text, not clickable).
 */
export function useLocationBrowser(routeId?: string) {
  const [path, setPath] = useState<Location[]>([]);
  const [children, setChildren] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ancestorLabel, setAncestorLabel] = useState<string | null>(null);

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

  useEffect(() => {
    if (routeId === parentId) return;
    if (!routeId) {
      setPath([]);
      setAncestorLabel(null);
      return;
    }
    const idx = path.findIndex((n) => n.id === routeId);
    if (idx !== -1) {
      setPath((prev) => prev.slice(0, idx + 1));
      setAncestorLabel(null);
      return;
    }
    let cancelled = false;
    getFullPath(routeId)
      .then((fullPath) => {
        if (cancelled) return;
        const segments = fullPath.split(" / ").filter(Boolean);
        const name = segments[segments.length - 1] ?? routeId;
        setAncestorLabel(segments.slice(0, -1).join(" / ") || null);
        setPath([{ id: routeId, parentId: null, name, levelType: "cabinet" }]);
      })
      .catch(() => {
        if (!cancelled) setPath([{ id: routeId, parentId: null, name: routeId, levelType: "cabinet" }]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

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

  return { path, children, loading, error, ancestorLabel, enter, goToRoot, goToCrumb, refresh };
}
