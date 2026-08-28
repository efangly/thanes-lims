import { useCallback, useEffect, useState } from "react";
import type { Location, LocationKind } from "@/lib/data";
import { getFullPath, listLocations } from "@/lib/locations-api";
import { rootLevel } from "@/lib/location-kinds";

/**
 * Drill-down state for browsing the Location tree one level at a time,
 * mirroring the backend's non-recursive `?parent_id=` contract. `path`
 * holds the ancestor chain from the root down to the level being viewed —
 * it doubles as the full path, so no extra full-path fetch is needed while browsing.
 *
 * `kind` picks which of the two trees is browsed (ADR-0008) — it only affects the
 * root listing, since every node below a root inherits its parent's tree.
 *
 * `routeId` (the `/locations/[id]` route param, if any) keeps `path` in sync with
 * the URL: on a fresh visit to an id already in `path` (browser back/forward to an
 * ancestor visited this session) it's just truncated; otherwise (deep link, hard
 * refresh) there's no backend "ancestors of id" endpoint to rebuild the full chain
 * from, so `path` becomes a single synthetic node built from `getFullPath`, and the
 * unresolved ancestor names are exposed as `ancestorLabel` (plain text, not clickable).
 */
export function useLocationBrowser(routeId?: string, kind: LocationKind = "sample_storage") {
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
      const rows = await listLocations(id, kind);
      setChildren(rows);
    } catch {
      setError("โหลดรายการ location ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load(parentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, kind]);

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
        setPath([{ id: routeId, parentId: null, name, kind, levelType: rootLevel(kind) }]);
      })
      .catch(() => {
        if (!cancelled) setPath([{ id: routeId, parentId: null, name: routeId, kind, levelType: rootLevel(kind) }]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  // Switching trees invalidates the whole ancestor chain — the nodes in `path`
  // belong to the tree we just left.
  useEffect(() => {
    setPath([]);
    setAncestorLabel(null);
  }, [kind]);

  const refresh = useCallback(() => load(parentId), [load, parentId]);

  /** Fetches `node`'s children and drills into it, returning them so callers can decide (e.g. treat an empty result as a leaf). */
  const enter = useCallback(async (node: Location): Promise<Location[]> => {
    const rows = await listLocations(node.id, kind);
    setPath((prev) => [...prev, node]);
    setChildren(rows);
    return rows;
  }, [kind]);

  /**
   * Jumps straight into `node` (a scanned mid-tree node), discarding any prior
   * ancestor chain — those crumbs belonged to a manual drill-down. The unresolved
   * ancestors are surfaced as `ancestorLabel`, same as a deep-linked route.
   */
  const jumpTo = useCallback(async (node: Location): Promise<Location[]> => {
    const rows = await listLocations(node.id, kind);
    setPath([node]);
    setChildren(rows);
    getFullPath(node.id)
      .then((fp) => {
        const segs = fp.split(" / ").filter(Boolean);
        setAncestorLabel(segs.slice(0, -1).join(" / ") || null);
      })
      .catch(() => setAncestorLabel(null));
    return rows;
  }, [kind]);

  const goToRoot = useCallback(() => {
    setPath([]);
    setAncestorLabel(null);
  }, []);
  const goToCrumb = useCallback((index: number) => setPath((prev) => prev.slice(0, index + 1)), []);

  return { path, children, loading, error, ancestorLabel, enter, jumpTo, goToRoot, goToCrumb, refresh };
}
