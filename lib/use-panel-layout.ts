"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Remembers the width (fractional flex-grow) and collapsed state of each panel in
 * a multi-panel browser across sessions. The `/locations` 3-panel browser
 * (ADR-0010) and the `/documents` 2-panel browser (ADR-0013) each pass their own
 * `storageKey`. SSR-safe: starts from `defaults` and only reads storage after
 * mount so the server and first client render agree.
 */
export interface PanelLayout {
  /** flex-grow weight per panel; only used while the panel is not collapsed */
  widths: number[];
  /** collapsed flag per panel */
  collapsed: boolean[];
}

const DEFAULT_KEY = "lims.locations.panels";

function sane(raw: unknown, n: number): PanelLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<PanelLayout>;
  if (!Array.isArray(o.widths) || !Array.isArray(o.collapsed)) return null;
  if (o.widths.length !== n || o.collapsed.length !== n) return null;
  if (!o.widths.every((w) => typeof w === "number" && w > 0)) return null;
  if (!o.collapsed.every((c) => typeof c === "boolean")) return null;
  return { widths: o.widths, collapsed: o.collapsed };
}

export function usePanelLayout(defaults: PanelLayout, storageKey: string = DEFAULT_KEY) {
  const n = defaults.widths.length;
  const [layout, setLayout] = useState<PanelLayout>(defaults);

  useEffect(() => {
    try {
      const stored = sane(JSON.parse(localStorage.getItem(storageKey) ?? "null"), n);
      if (stored) setLayout(stored);
    } catch {
      /* private mode / blocked storage — keep defaults */
    }
  }, [n, storageKey]);

  const persist = useCallback(
    (next: PanelLayout) => {
      setLayout(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const setWidth = useCallback(
    (index: number, width: number) =>
      persist({ ...layout, widths: layout.widths.map((w, i) => (i === index ? Math.max(0.15, width) : w)) }),
    [layout, persist]
  );

  const toggleCollapsed = useCallback(
    (index: number) => persist({ ...layout, collapsed: layout.collapsed.map((c, i) => (i === index ? !c : c)) }),
    [layout, persist]
  );

  return { layout, setWidth, toggleCollapsed };
}
