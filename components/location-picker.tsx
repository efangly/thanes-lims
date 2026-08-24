"use client";

import { useState } from "react";
import type { Location } from "@/lib/data";
import { LEVEL_LABEL } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { LocationBreadcrumb } from "@/components/location-breadcrumb";
import { useLocationBrowser } from "@/lib/use-location-browser";

/**
 * Drill-down selector for an existing leaf Location. Strict select only —
 * it never creates nodes; if the tree has no suitable leaf yet, the user
 * has to go create one in the Locations module first.
 */
export function LocationPicker({ onSelect, disabled = false }: { onSelect: (location: Location) => void; disabled?: boolean }) {
  const { path, children, loading, error, enter, goToRoot, goToCrumb } = useLocationBrowser();
  const [entering, setEntering] = useState<string | null>(null);

  const handleRowClick = async (node: Location) => {
    if (disabled) return;
    setEntering(node.id);
    try {
      const kids = await enter(node);
      if (kids.length === 0) {
        // no children → this node is a leaf, select it
        onSelect(node);
      }
    } finally {
      setEntering(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <LocationBreadcrumb path={path} onRoot={goToRoot} onCrumb={goToCrumb} />
      <div className="max-h-[280px] overflow-y-auto rounded-lg border border-line">
        {loading && <div className="px-3.5 py-4 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
        {error && <div className="px-3.5 py-4 text-center text-[12.5px] text-red">{error}</div>}
        {!loading && !error && children.length === 0 && (
          <div className="px-3.5 py-4 text-center text-[12.5px] text-muted">
            {path.length === 0 ? "ยังไม่มีตู้ในระบบ — ไปสร้างที่หน้า Locations ก่อน" : "ระดับนี้ไม่มีลูก"}
          </div>
        )}
        {children.map((node) => (
          <button
            key={node.id}
            onClick={() => handleRowClick(node)}
            disabled={disabled || entering !== null}
            className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-left text-[13px] transition last:border-b-0 hover:bg-bg disabled:opacity-50"
          >
            <Icons.Loc className="h-[15px] w-[15px] flex-none text-teal-d" />
            <span className="flex-1">{node.name}</span>
            <span className="font-mono text-[11px] text-muted">{LEVEL_LABEL[node.levelType]}</span>
            {entering === node.id ? (
              <span className="text-[11px] text-muted">กำลังเปิด…</span>
            ) : (
              <Icons.Arrow className="h-3.5 w-3.5 text-muted-2" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
