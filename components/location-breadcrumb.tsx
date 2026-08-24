"use client";

import type { Location } from "@/lib/data";
import { Icons } from "@/lib/icons";

export function LocationBreadcrumb({
  path,
  onRoot,
  onCrumb,
}: {
  path: Location[];
  onRoot: () => void;
  onCrumb: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
      <button
        onClick={onRoot}
        className={`rounded-md px-2 py-1 transition hover:bg-bg ${path.length === 0 ? "font-medium text-ink" : "text-muted"}`}
      >
        ตู้ทั้งหมด
      </button>
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
