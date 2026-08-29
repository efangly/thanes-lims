"use client";

import { memo } from "react";
import type { Location, LocationKind, Sample } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { boxOccupants, occupantOf } from "@/lib/occupancy";
import { levelLabel } from "@/lib/location-kinds";
import type { useLocationTree } from "@/lib/use-location-tree";

type TreeState = ReturnType<typeof useLocationTree>;

/**
 * Panel 1 of the `/locations` browser (ADR-0010) — the lazy-expanding tree.
 * Clicking a node's label selects it (the parent routes to `/locations/[id]`);
 * clicking the chevron expands/collapses without changing selection.
 */
export const LocationTree = memo(function LocationTree({
  kind,
  tree,
  samples,
  selectedId,
  onSelect,
}: {
  kind: LocationKind;
  tree: TreeState;
  samples: Sample[];
  selectedId: string | null;
  onSelect: (node: Location) => void;
}) {
  if (tree.rootsLoading) {
    return <div className="px-4 py-6 text-center text-[12.5px] text-muted">กำลังโหลด…</div>;
  }
  if (tree.error) {
    return <div className="px-4 py-6 text-center text-[12.5px] text-red">{tree.error}</div>;
  }
  if (tree.roots.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[12.5px] text-muted">
        ยังไม่มีตำแหน่งในระบบ — สร้างจากแผงตรงกลาง
      </div>
    );
  }

  return (
    <ul className="py-1.5">
      {tree.roots.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          kind={kind}
          tree={tree}
          samples={samples}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
});

function OccupancyBadge({ kind, node, samples }: { kind: LocationKind; node: Location; samples: Sample[] }) {
  if (kind !== "sample_storage") return null;

  if (node.levelType === "box" && node.rows && node.cols) {
    const used = boxOccupants(samples, node.id).size;
    const total = node.rows * node.cols;
    return (
      <span
        className={`flex-none rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
          used === 0 ? "bg-bg text-muted-2" : used >= total ? "bg-red-bg text-red" : "bg-teal-bg text-teal-d"
        }`}
      >
        {used}/{total}
      </span>
    );
  }

  // A plain node only ever has a direct occupant when it is a leaf.
  if (occupantOf(samples, node.id)) {
    return <span className="h-[7px] w-[7px] flex-none rounded-full bg-teal" title="มีตัวอย่างจัดเก็บอยู่" />;
  }
  return null;
}

function TreeNode({
  node,
  depth,
  kind,
  tree,
  samples,
  selectedId,
  onSelect,
}: {
  node: Location;
  depth: number;
  kind: LocationKind;
  tree: TreeState;
  samples: Sample[];
  selectedId: string | null;
  onSelect: (node: Location) => void;
}) {
  const isBox = node.levelType === "box";
  const isExpanded = tree.expanded.has(node.id);
  const isLoading = tree.loadingIds.has(node.id);
  const kids = tree.childrenById[node.id];
  const isSelected = selectedId === node.id;

  return (
    <li>
      <div
        className={`group flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-[13px] transition ${
          isSelected ? "bg-teal-bg text-teal-d" : "hover:bg-bg"
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {isBox ? (
          <span className="h-4 w-4 flex-none" />
        ) : (
          <button
            onClick={() => tree.toggle(node)}
            aria-label={isExpanded ? "หุบ" : "กาง"}
            className="grid h-4 w-4 flex-none place-items-center rounded text-muted-2 transition hover:text-ink"
          >
            <Icons.Chevron className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
        )}

        <Icons.Loc className={`h-[14px] w-[14px] flex-none ${isSelected ? "text-teal-d" : "text-muted-2"}`} />

        <button onClick={() => onSelect(node)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate font-medium">{node.name}</span>
          <span className="flex-none font-mono text-[10px] text-muted-2">{levelLabel(kind, node.levelType)}</span>
        </button>

        <OccupancyBadge kind={kind} node={node} samples={samples} />
      </div>

      {isExpanded && !isBox && (
        <>
          {isLoading && !kids && (
            <div className="py-1 text-[11.5px] text-muted-2" style={{ paddingLeft: 8 + (depth + 1) * 14 + 22 }}>
              กำลังโหลด…
            </div>
          )}
          {kids && kids.length === 0 && (
            <div className="py-1 text-[11.5px] text-muted-2" style={{ paddingLeft: 8 + (depth + 1) * 14 + 22 }}>
              {kind === "sample_storage" ? "จุดจัดเก็บ (leaf)" : "ยังไม่ได้แบ่งย่อย"}
            </div>
          )}
          {kids && kids.length > 0 && (
            <ul>
              {kids.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  kind={kind}
                  tree={tree}
                  samples={samples}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}
