"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/lib/icons";
import type { Location, LocationKind } from "@/lib/data";
import { TRANSFERRED_LABEL, boxOccupants, occupantOf } from "@/lib/occupancy";
import { LOCATION_KINDS, canHoldBox, childLevelLabel, isDeepestLevel, levelLabel, rootLabel } from "@/lib/location-kinds";
import { Button, Card, CardHead, Field, Input, PageHead, Seg } from "@/components/ui";
import { BoxGrid } from "@/components/box-grid";
import { LocationTree } from "@/components/location-tree";
import { LocationDetailPanel } from "@/components/location-detail-panel";
import { ResizablePanels, type PanelDef } from "@/components/resizable-panels";
import { AssignSampleToLocationModal } from "@/components/modals/assign-sample-to-location";
import { useLims } from "@/components/lims-data-context";
import { useConfirm } from "@/lib/confirm-context";
import { useLocationBrowser } from "@/lib/use-location-browser";
import { useLocationTree } from "@/lib/use-location-tree";
import { usePanelLayout } from "@/lib/use-panel-layout";
import { createBox, createRoot, deleteLocation, enlargeBox, generateChildren, getLocation } from "@/lib/locations-api";
import { apiErrorMessage } from "@/lib/api-client";

const KIND_ORDER: LocationKind[] = ["sample_storage", "equipment_storage"];
const KIND_DESC: Record<LocationKind, string> = {
  sample_storage:
    "ต้นไม้ตู้/ชั้น/ช่อง/sub-ช่อง สำหรับจัดเก็บตัวอย่าง — เลือกโหนดจากต้นไม้ทางซ้าย จัดการที่แผงกลาง ดูรายละเอียดทางขวา",
  equipment_storage:
    "ต้นไม้อาคาร/ห้อง/โซน/ตู้/ชั้น สำหรับวางเครื่องมือและสินค้าคงคลัง — ต้นไม้เดียวใช้ร่วมทั้งสองโมดูล ไม่จำกัด 1 ตำแหน่ง 1 ชิ้น",
};

const GRID_SHORTCUTS = [
  { label: "96 (8×12)", rows: 8, cols: 12 },
  { label: "81 (9×9)", rows: 9, cols: 9 },
  { label: "100 (10×10)", rows: 10, cols: 10 },
];

const PANEL_DEFAULTS = { widths: [1, 1.3, 1], collapsed: [false, false, false] };

/**
 * `/locations` as a 3-panel browser (ADR-0010): a lazy-expanding tree (Panel 1),
 * the selected node's contents + management actions or its Box grid (Panel 2),
 * and a sample / node detail panel (Panel 3). One static route: the selected node
 * lives in `?node=<id>` so switching nodes never remounts the browser (ADR-0010,
 * cf. ADR-0005). Serves both Location trees (ADR-0008).
 */
export function LocationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kindParam = searchParams.get("kind");
  const kind: LocationKind = kindParam === "equipment_storage" ? "equipment_storage" : "sample_storage";
  const currentId = searchParams.get("node") ?? undefined;

  const nodeQuery = (id: string) => {
    const q = new URLSearchParams({ node: id });
    if (kind === "equipment_storage") q.set("kind", kind);
    return `/locations?${q.toString()}`;
  };

  const { samples, equipment, inventory, pushToast, moveWithinBox } = useLims();
  const confirm = useConfirm();
  const { children, loading, error, ancestorLabel, path, refresh } = useLocationBrowser(currentId, kind);
  const tree = useLocationTree(kind);
  const { layout, setWidth, toggleCollapsed } = usePanelLayout(PANEL_DEFAULTS);

  const [mobilePane, setMobilePane] = useState(0);
  const [inspected, setInspected] = useState<import("@/lib/data").Sample | null>(null);

  const [rootName, setRootName] = useState("");
  const [creating, setCreating] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("5");
  const [generating, setGenerating] = useState(false);
  const [boxName, setBoxName] = useState("");
  const [boxRows, setBoxRows] = useState("8");
  const [boxCols, setBoxCols] = useState("12");
  const [creatingBox, setCreatingBox] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Location | null>(null);
  const [assignPosition, setAssignPosition] = useState<string | undefined>(undefined);

  const [resolvedNode, setResolvedNode] = useState<Location | null>(null);
  const [gridBusy, setGridBusy] = useState(false);

  useEffect(() => {
    setInspected(null);
    if (!currentId) {
      setResolvedNode(null);
      return;
    }
    let cancelled = false;
    getLocation(currentId)
      .then((n) => !cancelled && setResolvedNode(n))
      .catch(() => !cancelled && setResolvedNode(null));
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  const currentNode: Location | null = resolvedNode && resolvedNode.id === currentId ? resolvedNode : null;
  const box: Location | null = currentNode?.levelType === "box" ? currentNode : null;
  const fullPathText = [ancestorLabel, ...path.map((n) => n.name)].filter(Boolean).join(" / ");

  const selectNode = (node: Location) => {
    tree.expand(node);
    setInspected(null);
    setMobilePane(1);
    router.replace(nodeQuery(node.id), { scroll: false });
  };

  const afterMutation = (parentId: string | null) => {
    refresh();
    tree.refreshChildren(parentId);
  };

  const handleCreateRoot = async () => {
    if (!rootName.trim()) return;
    setCreating(true);
    try {
      await createRoot(rootName.trim(), kind);
      setRootName("");
      afterMutation(null);
      pushToast(`สร้าง${rootLabel(kind)}ใหม่เรียบร้อย`);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateChildren = async () => {
    const n = parseInt(count, 10);
    if (!currentNode || !prefix.trim() || !n || n < 1) return;
    setGenerating(true);
    try {
      await generateChildren(currentNode.id, prefix.trim(), n);
      setPrefix("");
      setCount("5");
      afterMutation(currentNode.id);
      pushToast("สร้างลูกเรียบร้อย");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateBox = async () => {
    const r = parseInt(boxRows, 10);
    const c = parseInt(boxCols, 10);
    if (!currentNode || !boxName.trim() || !r || !c) return;
    setCreatingBox(true);
    try {
      await createBox(currentNode.id, boxName.trim(), r, c);
      setBoxName("");
      afterMutation(currentNode.id);
      pushToast(`สร้างกล่อง "${boxName.trim()}" (${r}×${c}) เรียบร้อย`);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setCreatingBox(false);
    }
  };

  const handleDeleteClick = async (node: Location) => {
    const ok = await confirm({
      title: "ยืนยันการลบ",
      message: `ต้องการลบ "${node.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(node.id);
    try {
      await deleteLocation(node.id);
      afterMutation(currentNode?.id ?? null);
      pushToast("ลบเรียบร้อย");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBoxMove = async (moves: { sampleId: string; position: string }[]) => {
    if (!box) return;
    setGridBusy(true);
    try {
      await moveWithinBox(box.id, moves);
      pushToast("ย้ายตำแหน่งในกล่องเรียบร้อย");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setGridBusy(false);
    }
  };

  const handleBoxEnlarge = async (rows: number, cols: number) => {
    if (!box) return;
    setGridBusy(true);
    try {
      const updated = await enlargeBox(box.id, rows, cols);
      setResolvedNode(updated);
      pushToast(`ขยายกริดเป็น ${rows}×${cols} เรียบร้อย`);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setGridBusy(false);
    }
  };

  const canGenerateChildren =
    currentNode !== null && currentNode.levelType !== "box" && !isDeepestLevel(kind, currentNode.levelType);
  const canAddBox = currentNode !== null && canHoldBox(kind, currentNode.levelType);
  const tracksOccupancy = kind === "sample_storage";
  const isLeafView =
    tracksOccupancy && currentNode !== null && !box && !loading && !error && children.length === 0;

  const unassignedOrFree = samples.filter(
    (s) => (s.locationId === null || s.status.label === TRANSFERRED_LABEL) && s.locationId !== assignTarget?.id
  );
  const openAssign = (target: Location, position?: string) => {
    setAssignTarget(target);
    setAssignPosition(position);
  };

  // ---- Panel 2 body ----
  const panel2 = (
    <Card>
      <CardHead
        icon={<Icons.Loc />}
        title={currentNode ? currentNode.name : `${rootLabel(kind)}ทั้งหมด`}
        right={currentNode && <span className="font-mono text-[11.5px] text-muted">{levelLabel(kind, currentNode.levelType)}</span>}
      />
      {fullPathText && <div className="border-b border-line px-[18px] py-2 font-mono text-[11.5px] text-muted">{fullPathText}</div>}

      {box ? (
        <div className="px-[18px] py-4">
          <BoxGrid
            box={box}
            occupants={boxOccupants(samples, box.id)}
            mode="manage"
            busy={gridBusy}
            onPickEmpty={(position) => openAssign(box, position)}
            onMove={handleBoxMove}
            onEnlarge={handleBoxEnlarge}
            onInspect={(s) => {
              setInspected(s);
              setMobilePane(2);
            }}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3.5 border-b border-line px-[18px] py-3.5">
            {!currentNode ? (
              <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end">
                <Field label={`สร้าง${rootLabel(kind)}ใหม่ (root)`}>
                  <Input
                    value={rootName}
                    onChange={(e) => setRootName(e.target.value)}
                    placeholder={kind === "sample_storage" ? "เช่น Fridge-B" : "เช่น อาคารวิจัย 1"}
                  />
                </Field>
                <Button variant="teal" size="sm" onClick={handleCreateRoot} disabled={creating || !rootName.trim()}>
                  <Icons.Plus className="h-[14px] w-[14px]" />
                  {creating ? "กำลังสร้าง..." : `สร้าง${rootLabel(kind)}`}
                </Button>
              </div>
            ) : (
              <>
                {canGenerateChildren && (
                  <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end">
                    <Field label={`สร้างลูกของ "${currentNode.name}" (${levelLabel(kind, currentNode.levelType)} → ${childLevelLabel(kind, currentNode.levelType)})`}>
                      <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefix เช่น Shelf" />
                    </Field>
                    <Field label="จำนวน">
                      <Input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} className="w-24" />
                    </Field>
                    <Button variant="teal" size="sm" onClick={handleGenerateChildren} disabled={generating || !prefix.trim()}>
                      <Icons.Plus className="h-[14px] w-[14px]" />
                      {generating ? "กำลังสร้าง..." : "Generate"}
                    </Button>
                  </div>
                )}

                {canAddBox && (
                  <div className="flex flex-col gap-2.5">
                    {canGenerateChildren && <div className="text-[11px] font-medium text-muted-2">— หรือ —</div>}
                    <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end">
                      <Field label={`สร้างกล่อง (Box) ใน "${currentNode.name}"`}>
                        <Input value={boxName} onChange={(e) => setBoxName(e.target.value)} placeholder="เช่น Cryobox-1" />
                      </Field>
                      <Field label="แถว">
                        <Input type="number" min={1} max={26} value={boxRows} onChange={(e) => setBoxRows(e.target.value)} className="w-20" />
                      </Field>
                      <Field label="คอลัมน์">
                        <Input type="number" min={1} max={99} value={boxCols} onChange={(e) => setBoxCols(e.target.value)} className="w-20" />
                      </Field>
                      <Button variant="teal" size="sm" onClick={handleCreateBox} disabled={creatingBox || !boxName.trim()}>
                        <Icons.Plus className="h-[14px] w-[14px]" />
                        {creatingBox ? "กำลังสร้าง..." : "สร้างกล่อง"}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {GRID_SHORTCUTS.map((g) => (
                        <button
                          key={g.label}
                          onClick={() => {
                            setBoxRows(String(g.rows));
                            setBoxCols(String(g.cols));
                          }}
                          className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted transition hover:bg-bg"
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!canGenerateChildren && !canAddBox && (
                  <div className="text-[12.5px] text-muted">
                    &quot;{currentNode.name}&quot; เป็น {levelLabel(kind, currentNode.levelType)} — ระดับลึกสุดแล้ว แบ่งย่อยต่อไม่ได้
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            {loading && <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
            {error && <div className="px-[18px] py-6 text-center text-[12.5px] text-red">{error}</div>}
            {!loading && !error && children.length === 0 && currentNode && (
              <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">
                {tracksOccupancy
                  ? `"${currentNode.name}" ไม่มีลูก — เป็นจุดจัดเก็บ (leaf) แล้ว`
                  : `"${currentNode.name}" ยังไม่ได้แบ่งย่อย`}
              </div>
            )}
            {!loading && !error && !currentNode && (
              <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">เลือกโหนดจากต้นไม้ทางซ้าย</div>
            )}
            {children.map((node) => {
              const isBox = node.levelType === "box";
              const occupant = tracksOccupancy && !isBox ? occupantOf(samples, node.id) : undefined;
              const cellsUsed = isBox ? boxOccupants(samples, node.id).size : 0;
              return (
                <div key={node.id} className="flex items-center gap-2.5 border-b border-line px-[18px] py-3 last:border-b-0">
                  <Icons.Loc className="h-[15px] w-[15px] flex-none text-teal-d" />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{node.name}</div>
                    <div className="font-mono text-[11px] text-muted">
                      {levelLabel(kind, node.levelType)}
                      {isBox && node.rows && node.cols ? ` · ${node.rows}×${node.cols} · ใช้ ${cellsUsed}/${node.rows * node.cols}` : ""}
                      {occupant ? ` · ${occupant.id}` : ""}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => selectNode(node)}>
                    เปิด
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(node)}
                    disabled={deletingId !== null}
                    className="text-red hover:bg-red-bg"
                  >
                    {deletingId === node.id ? "กำลังลบ..." : <Icons.Close className="h-[13px] w-[13px]" />}
                  </Button>
                </div>
              );
            })}
          </div>

          {isLeafView && currentNode && (
            <div className="flex items-center justify-between gap-3 border-t border-line bg-bg px-[18px] py-3">
              <div className="text-[12.5px]">
                <span className="font-medium">{currentNode.name}</span> เป็นจุดจัดเก็บ (leaf)
                {occupantOf(samples, currentNode.id) ? (
                  <span className="text-muted"> — มี sample ครองอยู่แล้ว</span>
                ) : (
                  <span className="text-muted"> — ยังว่าง</span>
                )}
              </div>
              {!occupantOf(samples, currentNode.id) && (
                <Button variant="teal" size="sm" onClick={() => openAssign(currentNode)}>
                  <Icons.Sample className="h-[13px] w-[13px]" />
                  ผูก Sample
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );

  const panels: PanelDef[] = useMemo(
    () => [
      {
        key: "tree",
        title: "ต้นไม้ตำแหน่ง",
        icon: <Icons.Loc className="h-3.5 w-3.5" />,
        content: (
          <Card className="overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto">
              <LocationTree kind={kind} tree={tree} samples={samples} selectedId={currentId ?? null} onSelect={selectNode} />
            </div>
          </Card>
        ),
      },
      { key: "content", title: "เนื้อหา", icon: <Icons.Doc className="h-3.5 w-3.5" />, content: panel2 },
      {
        key: "detail",
        title: "รายละเอียด",
        icon: <Icons.Doc className="h-3.5 w-3.5" />,
        content: (
          <LocationDetailPanel
            kind={kind}
            node={currentNode}
            sample={inspected}
            onBack={() => setInspected(null)}
            samples={samples}
            equipment={equipment}
            inventory={inventory}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, tree, samples, currentId, currentNode, inspected, panel2, equipment, inventory]
  );

  return (
    <div className="animate-fade">
      <PageHead
        title="ตำแหน่งจัดเก็บ"
        desc={KIND_DESC[kind]}
        actions={
          <Seg
            options={KIND_ORDER.map((k) => LOCATION_KINDS[k].label)}
            value={KIND_ORDER.indexOf(kind)}
            onChange={(i) => {
              const next = KIND_ORDER[i];
              router.push(next === "sample_storage" ? "/locations" : `/locations?kind=${next}`);
            }}
          />
        }
      />

      <ResizablePanels
        panels={panels}
        layout={layout}
        setWidth={setWidth}
        toggleCollapsed={toggleCollapsed}
        mobilePane={mobilePane}
        onMobilePane={setMobilePane}
      />

      <AssignSampleToLocationModal
        location={assignTarget}
        position={assignPosition}
        candidates={unassignedOrFree}
        open={assignTarget !== null}
        onClose={() => {
          setAssignTarget(null);
          setAssignPosition(undefined);
        }}
      />
    </div>
  );
}
