"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Location, LocationKind } from "@/lib/data";
import { listLocations } from "@/lib/locations-api";

/**
 * Lazy-expanding tree state for Panel 1 of the `/locations` browser (ADR-0010).
 * The backend only lists one level at a time (`GET /locations?parent_id=`), so the
 * tree fetches a node's children the first time it is expanded and caches them in
 * `childrenById`. `kind` picks which of the two trees is shown; switching it drops
 * every cached level (nodes belong to the tree they were fetched from — ADR-0008).
 *
 * This hook owns navigation *context* only. The selected node is still the route
 * `/locations/[id]`, resolved separately by `use-location-browser`.
 */
export function useLocationTree(kind: LocationKind) {
  const [roots, setRoots] = useState<Location[]>([]);
  const [childrenById, setChildrenById] = useState<Record<string, Location[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [rootsLoading, setRootsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef<Set<string>>(new Set());

  const loadRoots = useCallback(() => {
    setRootsLoading(true);
    setError(null);
    listLocations(undefined, kind)
      .then((rows) => setRoots(rows))
      .catch(() => setError("โหลดต้นไม้ตำแหน่งไม่สำเร็จ"))
      .finally(() => setRootsLoading(false));
  }, [kind]);

  // Reset every cached level when the tree changes, then load its roots.
  useEffect(() => {
    setRoots([]);
    setChildrenById({});
    setExpanded(new Set());
    setLoadingIds(new Set());
    loadedRef.current = new Set();
    loadRoots();
  }, [kind, loadRoots]);

  const fetchChildren = useCallback(
    async (id: string) => {
      setLoadingIds((prev) => new Set(prev).add(id));
      try {
        const rows = await listLocations(id, kind);
        setChildrenById((prev) => ({ ...prev, [id]: rows }));
        loadedRef.current.add(id);
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [kind]
  );

  const toggle = useCallback(
    (node: Location) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
          if (!loadedRef.current.has(node.id)) void fetchChildren(node.id);
        }
        return next;
      });
    },
    [fetchChildren]
  );

  /** Expand `node` (loading children if needed) without toggling it shut. */
  const expand = useCallback(
    (node: Location) => {
      setExpanded((prev) => (prev.has(node.id) ? prev : new Set(prev).add(node.id)));
      if (!loadedRef.current.has(node.id)) void fetchChildren(node.id);
    },
    [fetchChildren]
  );

  /** Re-fetch one parent's children after a create / delete / generate. */
  const refreshChildren = useCallback(
    (parentId: string | null) => {
      if (parentId === null) {
        loadRoots();
        return;
      }
      loadedRef.current.delete(parentId);
      if (expanded.has(parentId)) void fetchChildren(parentId);
    },
    [expanded, fetchChildren, loadRoots]
  );

  return {
    roots,
    childrenById,
    expanded,
    loadingIds,
    rootsLoading,
    error,
    toggle,
    expand,
    refreshChildren,
  };
}
