import { useEffect, useState } from "react";
import { getFullPath } from "@/lib/locations-api";

/** Resolves a Location id to its live full path string (e.g. "Fridge-A / Shelf-2 / Slot-4"). */
export function useFullPath(locationId: string | null | undefined): { path: string | null; loading: boolean } {
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId) {
      setPath(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getFullPath(locationId)
      .then((p) => {
        if (!cancelled) setPath(p);
      })
      .catch(() => {
        if (!cancelled) setPath(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return { path, loading };
}
