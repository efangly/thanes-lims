"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { LEVEL_LABEL, type Location, type Sample } from "@/lib/data";
import { Button, Card, CardHead, Field, Input, PageHead } from "@/components/ui";
import { LocationBreadcrumb } from "@/components/location-breadcrumb";
import { AssignSampleToLocationModal } from "@/components/modals/assign-sample-to-location";
import { useLims } from "@/components/lims-data-context";
import { useLocationBrowser } from "@/lib/use-location-browser";
import { createCabinet, deleteLocation, generateChildren } from "@/lib/locations-api";
import { apiErrorMessage } from "@/lib/api-client";

const TRANSFERRED_LABEL = "ส่งต่อแผนก";

function occupantOf(samples: Sample[], locationId: string): Sample | undefined {
  return samples.find((s) => s.locationId === locationId && s.status.label !== TRANSFERRED_LABEL);
}

export default function LocationsPage() {
  const { samples, pushToast } = useLims();
  const { path, children, loading, error, enter, goToRoot, goToCrumb, refresh } = useLocationBrowser();
  const [entering, setEntering] = useState<string | null>(null);
  const [enteredLeaf, setEnteredLeaf] = useState<Location | null>(null);

  const [cabinetName, setCabinetName] = useState("");
  const [creating, setCreating] = useState(false);

  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("5");
  const [generating, setGenerating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Location | null>(null);

  const parent = path[path.length - 1] ?? null;

  const handleEnter = async (node: Location) => {
    setEntering(node.id);
    setEnteredLeaf(null);
    setConfirmDeleteId(null);
    try {
      const kids = await enter(node);
      if (kids.length === 0) setEnteredLeaf(node);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setEntering(null);
    }
  };

  const handleCreateCabinet = async () => {
    if (!cabinetName.trim()) return;
    setCreating(true);
    try {
      await createCabinet(cabinetName.trim());
      setCabinetName("");
      refresh();
      pushToast("สร้างตู้ใหม่เรียบร้อย");
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
      setEnteredLeaf(null);
      refresh();
      pushToast("สร้างลูกเรียบร้อย");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteConfirmed = async (node: Location) => {
    setConfirmDeleteId(null);
    setDeletingId(node.id);
    try {
      await deleteLocation(node.id);
      if (enteredLeaf?.id === node.id) setEnteredLeaf(null);
      refresh();
      pushToast("ลบเรียบร้อย");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setDeletingId(null);
    }
  };

  const canGenerateChildren = parent !== null && parent.levelType !== "sub_slot";
  const unassignedOrFree = samples.filter(
    (s) => (s.locationId === null || s.status.label === TRANSFERRED_LABEL) && s.locationId !== assignTarget?.id
  );

  return (
    <div className="animate-fade">
      <PageHead
        title="ตำแหน่งจัดเก็บ"
        desc="จัดการตู้/ชั้น/ช่อง/sub-ช่อง สำหรับจัดเก็บตัวอย่าง — ไล่ดูทีละระดับ สร้างลูกเป็นชุด และผูก sample เข้าตำแหน่งที่ต้องการได้โดยตรง"
      />

      <Card>
        <CardHead
          icon={<Icons.Loc />}
          title="Location Tree"
          right={
            <LocationBreadcrumb
              path={path}
              onRoot={() => {
                setConfirmDeleteId(null);
                setEnteredLeaf(null);
                goToRoot();
              }}
              onCrumb={(i) => {
                setConfirmDeleteId(null);
                setEnteredLeaf(null);
                goToCrumb(i);
              }}
            />
          }
        />

        <div className="flex flex-col gap-3.5 border-b border-line px-[18px] py-3.5 sm:flex-row sm:items-end">
          {path.length === 0 ? (
            <>
              <Field label="สร้างตู้ใหม่ (root)">
                <Input value={cabinetName} onChange={(e) => setCabinetName(e.target.value)} placeholder="เช่น Fridge-B" />
              </Field>
              <Button variant="teal" size="sm" onClick={handleCreateCabinet} disabled={creating || !cabinetName.trim()}>
                <Icons.Plus className="h-[14px] w-[14px]" />
                {creating ? "กำลังสร้าง..." : "สร้างตู้"}
              </Button>
            </>
          ) : canGenerateChildren ? (
            <>
              <Field label={`สร้างลูกของ "${parent!.name}" (${LEVEL_LABEL[parent!.levelType]} → ระดับถัดไป)`}>
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
              &quot;{parent?.name}&quot; เป็น {parent ? LEVEL_LABEL[parent.levelType] : ""} — ระดับลึกสุดแล้ว แบ่งย่อยต่อไม่ได้
            </div>
          )}
        </div>

        <div>
          {loading && <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
          {error && <div className="px-[18px] py-6 text-center text-[12.5px] text-red">{error}</div>}
          {!loading && !error && children.length === 0 && (
            <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">
              {path.length === 0
                ? "ยังไม่มีตู้ในระบบ — สร้างตู้แรกด้านบน"
                : `"${parent?.name}" ไม่มีลูก — เป็นจุดจัดเก็บ (leaf) แล้ว`}
            </div>
          )}
          {children.map((node) => {
            const occupant = occupantOf(samples, node.id);
            return (
              <div key={node.id} className="flex items-center gap-2.5 border-b border-line px-[18px] py-3 last:border-b-0">
                <Icons.Loc className="h-[15px] w-[15px] flex-none text-teal-d" />
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{node.name}</div>
                  <div className="font-mono text-[11px] text-muted">{LEVEL_LABEL[node.levelType]}</div>
                </div>
                {occupant && (
                  <span className="hidden items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 font-mono text-[11px] text-muted sm:flex">
                    <Icons.Sample className="h-3 w-3" />
                    {occupant.id}
                  </span>
                )}
                {confirmDeleteId === node.id ? (
                  <>
                    <span className="text-[12px] text-muted">ยืนยันลบ?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfirmed(node)}
                      disabled={deletingId !== null}
                      className="text-red hover:bg-red-bg"
                    >
                      {deletingId === node.id ? "กำลังลบ..." : "ยืนยัน"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={deletingId !== null}>
                      ยกเลิก
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleEnter(node)} disabled={entering !== null}>
                      {entering === node.id ? "..." : "เปิด"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(node.id)}
                      disabled={deletingId !== null}
                      className="text-red hover:bg-red-bg"
                    >
                      <Icons.Close className="h-[13px] w-[13px]" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {enteredLeaf && (
          <div className="flex items-center justify-between gap-3 border-t border-line bg-bg px-[18px] py-3">
            <div className="text-[12.5px]">
              <span className="font-medium">{enteredLeaf.name}</span> เป็นจุดจัดเก็บ (leaf)
              {occupantOf(samples, enteredLeaf.id) ? (
                <span className="text-muted"> — มี sample ครองอยู่แล้ว</span>
              ) : (
                <span className="text-muted"> — ยังว่าง</span>
              )}
            </div>
            {!occupantOf(samples, enteredLeaf.id) && (
              <Button variant="teal" size="sm" onClick={() => setAssignTarget(enteredLeaf)}>
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
