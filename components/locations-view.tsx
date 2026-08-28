"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/lib/icons";
import type { Location, LocationKind } from "@/lib/data";
import { TRANSFERRED_LABEL, occupantOf } from "@/lib/occupancy";
import { LOCATION_KINDS, childLevelLabel, isDeepestLevel, levelLabel, rootLabel } from "@/lib/location-kinds";
import { Button, Card, CardHead, Field, Input, PageHead, Seg } from "@/components/ui";
import { LocationBreadcrumb } from "@/components/location-breadcrumb";
import { AssignSampleToLocationModal } from "@/components/modals/assign-sample-to-location";
import { useLims } from "@/components/lims-data-context";
import { useConfirm } from "@/lib/confirm-context";
import { useLocationBrowser } from "@/lib/use-location-browser";
import { createRoot, deleteLocation, generateChildren } from "@/lib/locations-api";
import { apiErrorMessage } from "@/lib/api-client";

const KIND_ORDER: LocationKind[] = ["sample_storage", "equipment_storage"];
const KIND_DESC: Record<LocationKind, string> = {
  sample_storage:
    "จัดการตู้/ชั้น/ช่อง/sub-ช่อง สำหรับจัดเก็บตัวอย่าง — ไล่ดูทีละระดับ สร้างลูกเป็นชุด และผูก sample เข้าตำแหน่งที่ต้องการได้โดยตรง",
  equipment_storage:
    "จัดการอาคาร/ห้อง/โซน/ตู้/ชั้น สำหรับวางเครื่องมือและสินค้าคงคลัง — ต้นไม้เดียวใช้ร่วมกันทั้งสองโมดูล ไม่จำกัดว่า 1 ตำแหน่งมีได้ชิ้นเดียว",
};

/**
 * Shared by `/locations` (root) and `/locations/[id]` (deep-linkable drill-down level),
 * and by both Location trees — the level names, their depth and which one is the bottom
 * rung all come from the Kind rather than being hard-coded (ADR-0008).
 *
 * The Kind lives in `?kind=` rather than in component state because the drill-down
 * navigates to `/locations/[id]`: without it in the URL, a refresh or a shared link to
 * a node in the equipment tree would come back labelled as the sample tree.
 */
export function LocationsView({ currentId }: { currentId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kindParam = searchParams.get("kind");
  const kind: LocationKind = kindParam === "equipment_storage" ? "equipment_storage" : "sample_storage";
  const kindQuery = kind === "sample_storage" ? "" : `?kind=${kind}`;
  const { samples, pushToast } = useLims();
  const confirm = useConfirm();
  const { path, children, loading, error, ancestorLabel, enter, goToRoot, goToCrumb, refresh } = useLocationBrowser(currentId, kind);
  const [entering, setEntering] = useState<string | null>(null);

  const [rootName, setRootName] = useState("");
  const [creating, setCreating] = useState(false);

  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("5");
  const [generating, setGenerating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Location | null>(null);

  const parent = path[path.length - 1] ?? null;
  // Only the sample tree has occupancy: a Sample owns its leaf, while a room in the
  // equipment tree holds any number of machines and boxes at once (ADR-0008).
  const tracksOccupancy = kind === "sample_storage";
  const isLeafView = tracksOccupancy && !loading && !error && children.length === 0 && parent !== null;

  const handleEnter = async (node: Location) => {
    setEntering(node.id);
    try {
      await enter(node);
      router.push(`/locations/${node.id}${kindQuery}`);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setEntering(null);
    }
  };

  const handleCreateRoot = async () => {
    if (!rootName.trim()) return;
    setCreating(true);
    try {
      await createRoot(rootName.trim(), kind);
      setRootName("");
      refresh();
      pushToast(`สร้าง${rootLabel(kind)}ใหม่เรียบร้อย`);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateChildren = async () => {
    const n = parseInt(count, 10);
    if (!parent || !prefix.trim() || !n || n < 1) return;
    setGenerating(true);
    try {
      await generateChildren(parent.id, prefix.trim(), n);
      setPrefix("");
      setCount("5");
      refresh();
      pushToast("สร้างลูกเรียบร้อย");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setGenerating(false);
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
      refresh();
      pushToast("ลบเรียบร้อย");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setDeletingId(null);
    }
  };

  const canGenerateChildren = parent !== null && !isDeepestLevel(kind, parent.levelType);
  const unassignedOrFree = samples.filter(
    (s) => (s.locationId === null || s.status.label === TRANSFERRED_LABEL) && s.locationId !== assignTarget?.id
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
              // Always back to the roots: an id from the tree being left means nothing in the one being entered.
              const next = KIND_ORDER[i];
              router.push(next === "sample_storage" ? "/locations" : `/locations?kind=${next}`);
            }}
          />
        }
      />

      <Card>
        <CardHead
          icon={<Icons.Loc />}
          title="Location Tree"
          right={
            <LocationBreadcrumb
              path={path}
              ancestorLabel={ancestorLabel}
              rootCrumbLabel={`${rootLabel(kind)}ทั้งหมด`}
              onRoot={() => {
                goToRoot();
                router.push(`/locations${kindQuery}`);
              }}
              onCrumb={(i) => {
                goToCrumb(i);
                router.push(`/locations/${path[i].id}${kindQuery}`);
              }}
            />
          }
        />

        <div className="flex flex-col gap-3.5 border-b border-line px-[18px] py-3.5 sm:flex-row sm:items-end">
          {path.length === 0 ? (
            <>
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
            </>
          ) : canGenerateChildren ? (
            <>
              <Field label={`สร้างลูกของ "${parent!.name}" (${levelLabel(kind, parent!.levelType)} → ${childLevelLabel(kind, parent!.levelType)})`}>
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefix เช่น Shelf" />
              </Field>
              <Field label="จำนวน">
                <Input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} className="w-24" />
              </Field>
              <Button variant="teal" size="sm" onClick={handleGenerateChildren} disabled={generating || !prefix.trim()}>
                <Icons.Plus className="h-[14px] w-[14px]" />
                {generating ? "กำลังสร้าง..." : "Generate"}
              </Button>
            </>
          ) : (
            <div className="text-[12.5px] text-muted">
              &quot;{parent?.name}&quot; เป็น {parent ? levelLabel(kind, parent.levelType) : ""} — ระดับลึกสุดแล้ว แบ่งย่อยต่อไม่ได้
            </div>
          )}
        </div>

        <div>
          {loading && <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
          {error && <div className="px-[18px] py-6 text-center text-[12.5px] text-red">{error}</div>}
          {!loading && !error && children.length === 0 && (
            <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">
              {path.length === 0
                ? `ยังไม่มี${rootLabel(kind)}ในระบบ — สร้าง${rootLabel(kind)}แรกด้านบน`
                : tracksOccupancy
                  ? `"${parent?.name}" ไม่มีลูก — เป็นจุดจัดเก็บ (leaf) แล้ว`
                  : `"${parent?.name}" ยังไม่ได้แบ่งย่อย`}
            </div>
          )}
          {children.map((node) => {
            const occupant = tracksOccupancy ? occupantOf(samples, node.id) : undefined;
            return (
              <div key={node.id} className="flex items-center gap-2.5 border-b border-line px-[18px] py-3 last:border-b-0">
                <Icons.Loc className="h-[15px] w-[15px] flex-none text-teal-d" />
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{node.name}</div>
                  <div className="font-mono text-[11px] text-muted">{levelLabel(kind, node.levelType)}</div>
                </div>
                {occupant && (
                  <Link
                    href={`/samples?s=${occupant.id}`}
                    className="hidden items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 font-mono text-[11px] text-muted transition hover:bg-line sm:flex"
                  >
                    <Icons.Sample className="h-3 w-3" />
                    {occupant.id}
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleEnter(node)} disabled={entering !== null}>
                  {entering === node.id ? "..." : "เปิด"}
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

        {isLeafView && parent && (
          <div className="flex items-center justify-between gap-3 border-t border-line bg-bg px-[18px] py-3">
            <div className="text-[12.5px]">
              <span className="font-medium">{parent.name}</span> เป็นจุดจัดเก็บ (leaf)
              {occupantOf(samples, parent.id) ? (
                <span className="text-muted"> — มี sample ครองอยู่แล้ว</span>
              ) : (
                <span className="text-muted"> — ยังว่าง</span>
              )}
            </div>
            {!occupantOf(samples, parent.id) && (
              <Button variant="teal" size="sm" onClick={() => setAssignTarget(parent)}>
                <Icons.Sample className="h-[13px] w-[13px]" />
                ผูก Sample
              </Button>
            )}
          </div>
        )}
      </Card>

      <AssignSampleToLocationModal
        location={assignTarget}
        candidates={unassignedOrFree}
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
      />
    </div>
  );
}
