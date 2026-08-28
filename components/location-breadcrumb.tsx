"use client";

import type { Location } from "@/lib/data";
import { Icons } from "@/lib/icons";

export function LocationBreadcrumb({
  path,
  ancestorLabel,
  onRoot,
  onCrumb,
  rootCrumbLabel = "ตู้ทั้งหมด",
}: {
  path: Location[];
  ancestorLabel?: string | null;
  onRoot: () => void;
  onCrumb: (index: number) => void;
  /** Names the tree's root level — "ตู้ทั้งหมด" in the sample tree, "อาคารทั้งหมด" in the equipment one. */
  rootCrumbLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
      <button
        onClick={onRoot}
        className={`rounded-md px-2 py-1 transition hover:bg-bg ${path.length === 0 ? "font-medium text-ink" : "text-muted"}`}
      >
        {rootCrumbLabel}
      </button>
      {ancestorLabel && (
        <span className="flex items-center gap-1.5 px-1 italic text-muted-2">
          <Icons.Arrow className="h-3 w-3" />
          {ancestorLabel}
        </span>
      )}
      {path.map((node, i) => (
        <span key={node.id} className="flex items-center gap-1.5">
          <Icons.Arrow className="h-3 w-3 text-muted-2" />
          <button
            onClick={() => onCrumb(i)}
            className={`rounded-md px-2 py-1 transition hover:bg-bg ${i === path.length - 1 ? "font-medium text-ink" : "text-muted"}`}
          >
            {node.name}
          </button>
        </span>
      ))}
    </div>
  );
}
