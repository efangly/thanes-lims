"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Button, Card, CardHead, Field, Input, Tag } from "@/components/ui";
import { Modal } from "@/components/modal";
import { useConfirm } from "@/lib/confirm-context";
import { formatDate } from "@/lib/backend-mappers";
import { VendorSelect } from "@/components/vendor-select";
import { LocationField } from "@/components/location-field";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { useFullPath } from "@/lib/use-full-path";
import {
  getEquipment,
  listCalibrationEvents,
  listEquipmentDocuments,
  listEquipmentSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  type CalibrationEvent,
  type CalibrationSchedule,
  type EquipmentPatch,
  type ScheduleInput,
} from "@/lib/equipment-api";
import { listVendors, type Vendor } from "@/lib/vendors-api";
import type { Document } from "@/lib/data";

function useVendors(): Vendor[] {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  useEffect(() => {
    let cancelled = false;
    listVendors()
      .then((v) => !cancelled && setVendors(v))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return vendors;
}

export function EquipmentDetail({ id }: { id: string }) {
  const { equipment, patchEquipmentFields, openModal, pushToast } = useLims();
  const fromList = equipment.find((e) => e.id === id) ?? null;
  const [eq, setEq] = useState(fromList);
  const [notFound, setNotFound] = useState(false);

  // The list in context may not be loaded yet (hard refresh onto this route).
  useEffect(() => {
    if (fromList) {
      setEq(fromList);
      return;
    }
    let cancelled = false;
    getEquipment(id)
      .then((e) => !cancelled && setEq(e))
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [id, fromList]);

  if (notFound) {
    return (
      <div className="animate-fade">
        <BackLink />
        <Card className="mt-4">
          <div className="px-5 py-10 text-center text-[13px] text-muted">ไม่พบเครื่องมือรหัส {id}</div>
        </Card>
      </div>
    );
  }
  if (!eq) {
    return (
      <div className="animate-fade">
        <BackLink />
        <div className="mt-4 px-5 py-10 text-center text-[13px] text-muted">กำลังโหลด…</div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <BackLink />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[19px] font-semibold">{eq.name}</h1>
        <span className="font-mono text-[12.5px] text-muted">{eq.id}</span>
        <Tag {...eq.status} />
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => openModal("record-calibration", { equipmentId: eq.id })}
        >
          <Icons.Check className="h-[13px] w-[13px]" />
          บันทึกผลสอบเทียบ
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <AssetCard eq={eq} onSaved={setEq} save={patchEquipmentFields} pushToast={pushToast} />
          <CalibrationSchedulesCard id={eq.id} pushToast={pushToast} />
        </div>
        <div className="flex flex-col gap-4">
          <DocumentsCard id={eq.id} openModal={openModal} />
          <CalibrationHistoryCard id={eq.id} />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/equipment" className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink">
      <Icons.Arrow className="h-3.5 w-3.5 rotate-180" />
      กลับไปทะเบียนเครื่องมือ
    </Link>
  );
}

type Eq = NonNullable<ReturnType<typeof useLims>["equipment"][number]>;

function AssetCard({
  eq,
  onSaved,
  save,
  pushToast,
}: {
  eq: Eq;
  onSaved: (e: Eq) => void;
  save: (id: string, patch: EquipmentPatch) => Promise<Eq>;
  pushToast: (m: string, tone?: "red" | "teal") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: eq.name,
    sn: eq.sn,
    category: eq.category,
    manufacturer: eq.manufacturer,
    model: eq.model,
    installDate: eq.installDate ?? "",
    vendorId: eq.vendorId,
    locationId: eq.locationId,
    locationLabel: null as string | null,
  });
  const { path: locPath } = useFullPath(eq.locationId);
  const vendors = useVendors();
  const vendorName = eq.vendorId ? vendors.find((v) => v.id === eq.vendorId)?.name ?? eq.vendorId : "";

  const start = () => {
    setF({
      name: eq.name,
      sn: eq.sn,
      category: eq.category,
      manufacturer: eq.manufacturer,
      model: eq.model,
      installDate: eq.installDate ?? "",
      vendorId: eq.vendorId,
      locationId: eq.locationId,
      locationLabel: locPath,
    });
    setEditing(true);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const updated = await save(eq.id, {
        name: f.name.trim(),
        sn: f.sn.trim(),
        category: f.category.trim(),
        manufacturer: f.manufacturer.trim(),
        model: f.model.trim(),
        installDate: f.installDate || null,
        vendorId: f.vendorId,
        locationId: f.locationId,
      });
      onSaved(updated);
      setEditing(false);
      pushToast("บันทึกข้อมูลเครื่องมือแล้ว");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHead
        icon={<Icons.Equipment />}
        title="ข้อมูลทรัพย์สิน"
        right={
          !editing ? (
            <Button variant="ghost" size="sm" onClick={start}>
              แก้ไข
            </Button>
          ) : (
            <span className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                ยกเลิก
              </Button>
              <Button variant="teal" size="sm" onClick={submit} disabled={busy}>
                {busy ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </span>
          )
        }
      />
      {!editing ? (
        <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2.5 px-5 py-4 text-[13px]">
          <Row k="ชื่อเครื่องมือ" v={eq.name} />
          <Row k="Serial Number" v={eq.sn} mono />
          <Row k="ประเภท" v={eq.category} />
          <Row k="ผู้ผลิต" v={eq.manufacturer} />
          <Row k="รุ่น" v={eq.model} />
          <Row k="วันที่ติดตั้ง" v={eq.installDate} mono />
          <Row k="ผู้ขาย (Vendor)" v={vendorName} />
          <Row k="ตำแหน่งจัดเก็บ" v={locPath} mono />
          <Row k="ชั่วโมงใช้งานสะสม" v={eq.usage} mono />
        </dl>
      ) : (
        <div className="flex flex-col gap-3 px-5 py-4">
          <Field label="ชื่อเครื่องมือ">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serial Number">
              <Input value={f.sn} onChange={(e) => setF({ ...f, sn: e.target.value })} />
            </Field>
            <Field label="ประเภท">
              <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
            </Field>
            <Field label="ผู้ผลิต">
              <Input value={f.manufacturer} onChange={(e) => setF({ ...f, manufacturer: e.target.value })} />
            </Field>
            <Field label="รุ่น">
              <Input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} />
            </Field>
            <Field label="วันที่ติดตั้ง">
              <Input
                type="date"
                value={f.installDate}
                onChange={(e) => setF({ ...f, installDate: e.target.value })}
              />
            </Field>
          </div>
          <VendorSelect value={f.vendorId} onChange={(v) => setF({ ...f, vendorId: v })} />
          <LocationField
            kind="equipment_storage"
            value={f.locationId}
            valueLabel={f.locationLabel}
            onChange={(loc) =>
              setF({ ...f, locationId: loc?.id ?? null, locationLabel: loc?.name ?? null })
            }
          />
        </div>
      )}
    </Card>
  );
}

function Row({ k, v, mono }: { k: string; v: string | null | undefined; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted">{k}</dt>
      <dd className={mono ? "font-mono text-[12.5px]" : ""}>{v || <span className="text-muted-2">—</span>}</dd>
    </>
  );
}

function DocumentsCard({ id, openModal }: { id: string; openModal: ReturnType<typeof useLims>["openModal"] }) {
  const [docs, setDocs] = useState<Document[] | null>(null);
  const { documents } = useLims();

  useEffect(() => {
    let cancelled = false;
    listEquipmentDocuments(id)
      .then((d) => !cancelled && setDocs(d))
      .catch(() => !cancelled && setDocs([]));
    // re-fetch whenever the global documents list grows (a new upload happened)
    return () => {
      cancelled = true;
    };
  }, [id, documents.length]);

  return (
    <Card>
      <CardHead
        icon={<Icons.Doc />}
        title="เอกสารแนบ"
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              openModal("upload-document", {
                equipmentId: id,
                docType: "warranty",
                docTypeLabel: "ประเภท: บัตรรับประกัน (Warranty)",
              })
            }
          >
            <Icons.Plus className="h-[13px] w-[13px]" />
            เพิ่มเอกสาร
          </Button>
        }
      />
      <div>
        {docs === null && <div className="px-5 py-4 text-[12.5px] text-muted">กำลังโหลด…</div>}
        {docs?.length === 0 && <div className="px-5 py-4 text-[12.5px] text-muted">ยังไม่มีเอกสารแนบ</div>}
        {docs?.map((d) => (
          <div key={d.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-none">
            <Icons.Doc className="h-4 w-4 flex-none text-violet" />
            <div className="flex-1">
              <div className="text-[13px] font-medium">{d.name}</div>
              <div className="text-[11.5px] text-muted">
                {d.type} · {d.ver} · {d.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CalibrationHistoryCard({ id }: { id: string }) {
  const [events, setEvents] = useState<CalibrationEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCalibrationEvents(id)
      .then((e) => !cancelled && setEvents(e))
      .catch(() => !cancelled && setEvents([]));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <Card>
      <CardHead
        icon={<Icons.Clock />}
        title="ประวัติสอบเทียบล่าสุด"
        right={
          <Link
            href={`/equipment/calibration-results?equipment_id=${encodeURIComponent(id)}`}
            className="text-[12px] font-medium text-teal-d hover:underline"
          >
            ดูทั้งหมด
          </Link>
        }
      />
      <div>
        {events === null && <div className="px-5 py-4 text-[12.5px] text-muted">กำลังโหลด…</div>}
        {events?.length === 0 && <div className="px-5 py-4 text-[12.5px] text-muted">ยังไม่มีประวัติสอบเทียบ</div>}
        {events?.slice(0, 5).map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-none">
            <div className="flex-1">
              <div className="text-[13px] font-medium">{ev.type || "สอบเทียบ"}</div>
              <div className="text-[11.5px] text-muted">
                {ev.calibratedAt} · โดย {ev.performedBy || "—"}
                {ev.measured && ` · วัดได้ ${ev.measured}`}
                {ev.acceptance && ` (ยอมรับ ${ev.acceptance})`}
              </div>
            </div>
            {ev.result && <Tag tone={ev.result === "pass" ? "green" : "red"} label={ev.result === "pass" ? "ผ่าน" : "ไม่ผ่าน"} />}
          </div>
        ))}
      </div>
    </Card>
  );
}

function CalibrationSchedulesCard({
  id,
  pushToast,
}: {
  id: string;
  pushToast: (m: string, tone?: "red" | "teal") => void;
}) {
  const confirm = useConfirm();
  const [rows, setRows] = useState<CalibrationSchedule[] | null>(null);
  const [editing, setEditing] = useState<CalibrationSchedule | "new" | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = () =>
    listEquipmentSchedules(id)
      .then(setRows)
      .catch(() => setRows([]));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const remove = async (s: CalibrationSchedule) => {
    const ok = await confirm({
      title: "ลบรอบสอบเทียบ",
      message: `ลบ "${s.label}" ใช่หรือไม่? ระบบลบถาวร (hard delete) ย้อนกลับไม่ได้`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(s.id);
    try {
      await deleteSchedule(id, s.id);
      pushToast("ลบรอบสอบเทียบแล้ว");
      reload();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHead
        icon={<Icons.Clock />}
        title="ตารางสอบเทียบ (Calibration Schedules)"
        right={
          <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
            <Icons.Plus className="h-[13px] w-[13px]" />
            เพิ่มรอบ
          </Button>
        }
      />
      <div>
        {rows === null && <div className="px-5 py-4 text-[12.5px] text-muted">กำลังโหลด…</div>}
        {rows?.length === 0 && (
          <div className="px-5 py-4 text-[12.5px] text-muted">
            ยังไม่มีรอบสอบเทียบ — ตารางทะเบียนจะขึ้น &quot;ยังไม่ตั้งรอบสอบเทียบ&quot; จนกว่าจะเพิ่ม
          </div>
        )}
        {rows?.map((s) => (
          <div key={s.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-none">
            <div className="flex-1">
              <div className="text-[13px] font-medium">{s.label}</div>
              <div className="text-[11.5px] text-muted">
                ครบกำหนด {formatDate(s.nextDueDate)}
                {s.intervalMonths ? ` · ทุก ${s.intervalMonths} เดือน` : ""}
              </div>
              {!s.intervalMonths && (
                <div className="mt-1 inline-block rounded bg-amber-bg px-1.5 py-0.5 text-[10.5px] text-amber">
                  ต้องกรอกวันถัดไปเองทุกครั้ง
                </div>
              )}
            </div>
            <button
              onClick={() => setEditing(s)}
              disabled={busyId === s.id}
              className="text-[12px] text-teal-d hover:underline"
            >
              แก้ไข
            </button>
            <button
              onClick={() => remove(s)}
              disabled={busyId === s.id}
              className="text-[12px] text-red hover:underline"
            >
              ลบ
            </button>
          </div>
        ))}
      </div>
      {editing && (
        <ScheduleFormModal
          equipmentId={id}
          schedule={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          pushToast={pushToast}
        />
      )}
    </Card>
  );
}

function ScheduleFormModal({
  equipmentId,
  schedule,
  onClose,
  onSaved,
  pushToast,
}: {
  equipmentId: string;
  schedule: CalibrationSchedule | null;
  onClose: () => void;
  onSaved: () => void;
  pushToast: (m: string, tone?: "red" | "teal") => void;
}) {
  const [label, setLabel] = useState(schedule?.label ?? "");
  const [nextDue, setNextDue] = useState(schedule ? schedule.nextDueDate.slice(0, 10) : "");
  const [interval, setInterval] = useState(schedule?.intervalMonths ? String(schedule.intervalMonths) : "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!label.trim() || !nextDue) return;
    const input: ScheduleInput = {
      label: label.trim(),
      nextDueDate: nextDue,
      intervalMonths: interval.trim() ? Number(interval) : null,
    };
    setBusy(true);
    try {
      if (schedule) await updateSchedule(equipmentId, schedule.id, input);
      else await createSchedule(equipmentId, input);
      pushToast(schedule ? "แก้ไขรอบสอบเทียบแล้ว" : "เพิ่มรอบสอบเทียบแล้ว");
      onSaved();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={schedule ? "แก้ไขรอบสอบเทียบ" : "เพิ่มรอบสอบเทียบ"}
      icon={<Icons.Clock />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={submit} disabled={busy || !label.trim() || !nextDue}>
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อรอบ (Label)">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="เช่น สอบเทียบภายนอก" autoFocus />
        </Field>
        <Field label="วันครบกำหนดถัดไป">
          <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
        </Field>
        <Field label="รอบซ้ำ (เดือน) — เว้นว่างได้">
          <Input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="เช่น 12"
          />
        </Field>
        <p className="text-[11.5px] text-muted">
          ไม่ใส่รอบซ้ำ = หลังบันทึกผลแต่ละครั้งต้องกลับมาตั้งวันครบกำหนดถัดไปเอง
        </p>
      </div>
    </Modal>
  );
}
