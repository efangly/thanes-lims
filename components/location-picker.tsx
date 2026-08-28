"use client";

import { useState } from "react";
import type { Location, LocationKind } from "@/lib/data";
import { levelLabel, rootLabel } from "@/lib/location-kinds";
import { Icons } from "@/lib/icons";
import { LocationBreadcrumb } from "@/components/location-breadcrumb";
import { ScanInput } from "@/components/scan-input";
import { useLocationBrowser } from "@/lib/use-location-browser";
import { useLims } from "@/components/lims-data-context";
import { occupantOf } from "@/lib/occupancy";
import { apiErrorMessage } from "@/lib/api-client";
import { lookupLocationByBarcode } from "@/lib/locations-api";

/**
 * Drill-down selector for an existing leaf Location. Strict select only —
 * it never creates nodes; if the tree has no suitable leaf yet, the user
 * has to go create one in the Locations module first.
 *
 * With `emptyLeavesOnly` (put-away flow, ADR-0008 / task phase 4) an occupied
 * leaf is shown but marked and unselectable — the backend rejects it anyway, and
 * the operator must see which slots are taken. The picker never auto-picks a free
 * slot: the system choosing one slot while the person puts the tube in another
 * splits the record from reality.
 */
export function LocationPicker({
  onSelect,
  kind = "sample_storage",
  disabled = false,
  emptyLeavesOnly = false,
  enableScan = false,
}: {
  onSelect: (location: Location) => void;
  /** Which tree to browse — a picker never has a default tree in the domain, only in this signature (ADR-0008). */
  kind?: LocationKind;
  disabled?: boolean;
  /** Mark occupied leaves unselectable — for moving a sample into storage. */
  emptyLeavesOnly?: boolean;
  /** Show a scan field that jumps to the scanned cabinet's subtree (or selects it if it is a free leaf). */
  enableScan?: boolean;
}) {
  const { path, children, loading, error, ancestorLabel, enter, jumpTo, goToRoot, goToCrumb } = useLocationBrowser(
    undefined,
    kind
  );
  const { samples, pushToast } = useLims();
  const [entering, setEntering] = useState<string | null>(null);

  const isBlockedLeaf = (node: Location) => emptyLeavesOnly && Boolean(occupantOf(samples, node.id));

  const selectLeaf = (node: Location) => {
    if (isBlockedLeaf(node)) {
      pushToast(`${node.name} มีตัวอย่างอื่นครองอยู่แล้ว`, "red");
      return false;
    }
    onSelect(node);
    return true;
  };

  const handleRowClick = async (node: Location) => {
    if (disabled) return;
    setEntering(node.id);
    try {
      const kids = await enter(node);
      if (kids.length === 0) selectLeaf(node);
    } finally {
      setEntering(null);
    }
  };

  const handleScan = async (code: string) => {
    try {
      const node = await lookupLocationByBarcode(code);
      if (node.kind !== kind) {
        pushToast("บาร์โค้ดนี้ไม่ได้อยู่ในต้นไม้ตำแหน่งที่กำลังเลือก", "red");
        return false;
      }
      const kids = await jumpTo(node);
      if (kids.length === 0) return selectLeaf(node);
      return true;
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {enableScan && (
        <ScanInput
          onScan={handleScan}
          disabled={disabled}
          placeholder="สแกนบาร์โค้ดตู้/ช่อง แล้วกด Enter"
          label="สแกนตำแหน่ง"
        />
      )}
      {ancestorLabel && <div className="font-mono text-[11px] text-muted-2">{ancestorLabel} /</div>}
      <LocationBreadcrumb path={path} onRoot={goToRoot} onCrumb={goToCrumb} rootCrumbLabel={`${rootLabel(kind)}ทั้งหมด`} />
      <div className="max-h-[280px] overflow-y-auto rounded-lg border border-line">
        {loading && <div className="px-3.5 py-4 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
        {error && <div className="px-3.5 py-4 text-center text-[12.5px] text-red">{error}</div>}
        {!loading && !error && children.length === 0 && (
          <div className="px-3.5 py-4 text-center text-[12.5px] text-muted">
            {path.length === 0 ? `ยังไม่มี${rootLabel(kind)}ในระบบ — ไปสร้างที่หน้าตำแหน่งจัดเก็บก่อน` : "ระดับนี้ไม่มีลูก"}
          </div>
        )}
        {children.map((node) => {
          const blocked = isBlockedLeaf(node);
          return (
            <button
              key={node.id}
              onClick={() => handleRowClick(node)}
              disabled={disabled || entering !== null || blocked}
              className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-left text-[13px] transition last:border-b-0 hover:bg-bg disabled:opacity-50"
            >
              <Icons.Loc className="h-[15px] w-[15px] flex-none text-teal-d" />
              <span className="flex-1">{node.name}</span>
              {blocked && <span className="text-[11px] text-amber">มีตัวอย่างครองอยู่</span>}
              <span className="font-mono text-[11px] text-muted">{levelLabel(kind, node.levelType)}</span>
              {entering === node.id ? (
                <span className="text-[11px] text-muted">กำลังเปิด…</span>
              ) : (
                <Icons.Arrow className="h-3.5 w-3.5 text-muted-2" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
