"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input } from "@/components/ui";
import { VendorSelect } from "@/components/vendor-select";
import { useLims } from "@/components/lims-data-context";
import { useUiStore } from "@/lib/stores/ui-store";
import { apiErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/backend-mappers";
import { limsKeys } from "@/lib/queries/keys";
import { listEquipmentSchedules, recordMaintenance, type MaintenanceSchedule } from "@/lib/equipment-api";

/** Local yyyy-mm-dd — the `max` of the date picker, so a future day can't be picked. */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Same matching the backend uses to advance a schedule: case-insensitive, trimmed. */
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Log a Maintenance Event (append-only). The type is a combobox over this
 * machine's Maintenance Schedule labels — matching one advances that schedule's
 * next due date; anything else (e.g. a breakdown repair) is kept as history only.
 */
export function RecordMaintenanceModal() {
  const { equipment } = useLims();
  const qc = useQueryClient();
  const activeModal = useUiStore((s) => s.activeModal);
  const modalContext = useUiStore((s) => s.modalContext);
  const closeModal = useUiStore((s) => s.closeModal);
  const pushToast = useUiStore((s) => s.pushToast);
  const open = activeModal === "record-maintenance";
  const preset = modalContext.equipmentId ?? null;

  const [equipmentId, setEquipmentId] = useState<string | null>(preset);
  const [search, setSearch] = useState("");
  const [schedules, setSchedules] = useState<MaintenanceSchedule[] | null>(null);
  const [performedAt, setPerformedAt] = useState(todayLocal());
  const [type, setType] = useState("");
  const [result, setResult] = useState<"pass" | "fail" | "">("");
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEquipmentId(preset);
    setSearch("");
    setSchedules(null);
    setPerformedAt(todayLocal());
    setType("");
    setResult("");
    setVendorId(null);
    setNotes("");
  }, [open, preset]);

  // Keyed on `open` too: reopening for the same machine must refetch, since the reset above cleared the list.
  useEffect(() => {
    if (!open || !equipmentId) {
      setSchedules(null);
      return;
    }
    let cancelled = false;
    listEquipmentSchedules(equipmentId, "maintenance")
      .then((s) => {
        if (cancelled) return;
        setSchedules(s);
        setType((t) => t || (s[0]?.label ?? ""));
      })
      .catch(() => !cancelled && setSchedules([]));
    return () => {
      cancelled = true;
    };
  }, [open, equipmentId]);

  const eq = equipment.find((e) => e.id === equipmentId) ?? null;
  const matched = schedules?.filter((s) => type.trim() && norm(s.label) === norm(type)) ?? [];
  const labels = useMemo(() => Array.from(new Set(schedules?.map((s) => s.label) ?? [])), [schedules]);
  const today = todayLocal();
  const futureDate = performedAt > today;

  const matches = useMemo(() => {
    const n = search.trim().toLowerCase();
    if (!n) return equipment.slice(0, 8);
    return equipment.filter((e) => e.name.toLowerCase().includes(n) || e.sn.toLowerCase().includes(n)).slice(0, 8);
  }, [search, equipment]);

  const canSubmit = Boolean(equipmentId && type.trim() && performedAt && !futureDate && !submitting);

  const submit = async () => {
    if (!equipmentId || !canSubmit) return;
    const onRecorded = modalContext.onMaintenanceRecorded;
    setSubmitting(true);
    try {
      await recordMaintenance(equipmentId, {
        performedAt,
        maintenanceType: type.trim(),
        notes: notes.trim(),
        result: result || undefined,
        vendorId,
      });
      // next_due_date / maintenance_status may have moved — the equipment prefix also covers the summary.
      qc.invalidateQueries({ queryKey: limsKeys.equipment });
      onRecorded?.();
      pushToast("บันทึก MA แล้ว");
      closeModal();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="บันทึกการบำรุงรักษา (MA)"
      icon={<Icons.Equipment />}
      size="md"
      footer={
        eq ? (
          <>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button variant="teal" size="sm" onClick={submit} disabled={!canSubmit}>
              {submitting ? "กำลังบันทึก..." : "บันทึก MA"}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3.5">
        {!eq ? (
          <Field label="เลือกเครื่องมือ (ค้นด้วยชื่อ หรือ S/N)">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="พิมพ์เพื่อค้นหา" autoFocus />
            <div className="mt-1.5 max-h-50 overflow-y-auto rounded-lg border border-line">
              {matches.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEquipmentId(e.id)}
                  className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left text-[13px] last:border-none hover:bg-bg"
                >
                  <span>{e.name}</span>
                  <span className="font-mono text-[11px] text-muted">{e.sn || e.id}</span>
                </button>
              ))}
              {matches.length === 0 && <div className="px-3 py-3 text-[12.5px] text-muted">ไม่พบเครื่องมือ</div>}
            </div>
          </Field>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-line bg-bg px-3.5 py-2.5">
              <div>
                <div className="text-[13px] font-medium">{eq.name}</div>
                <div className="font-mono text-[11.5px] text-muted">
                  {eq.id}
                  {eq.sn && ` · S/N ${eq.sn}`}
                </div>
              </div>
              {!preset && (
                <button onClick={() => setEquipmentId(null)} className="text-[12px] text-muted hover:underline">
                  เปลี่ยน
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="วันที่ทำ" error={futureDate ? "เลือกวันในอนาคตไม่ได้" : undefined}>
                <Input type="date" value={performedAt} max={today} onChange={(e) => setPerformedAt(e.target.value)} />
              </Field>
              <Field label="ประเภท MA (เลือกจากรอบ หรือพิมพ์เอง)">
                <Input
                  list="ma-type-options"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="เช่น PM ประจำปี, ซ่อมเครื่องเสีย"
                />
                <datalist id="ma-type-options">
                  {labels.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </Field>
            </div>

            {type.trim() && schedules !== null && (
              <div className="rounded-lg border border-line bg-bg px-3 py-2 text-[11.5px] text-muted">
                {matched.length > 0
                  ? matched.some((s) => s.intervalMonths)
                    ? `ตรงกับรอบ "${matched[0].label}" — ระบบจะเลื่อนวันครบกำหนดถัดไปให้อัตโนมัติ (ปัจจุบัน ${formatDate(matched[0].nextDueDate)})`
                    : `ตรงกับรอบ "${matched[0].label}" แต่รอบนี้ไม่มีรอบซ้ำ — ต้องไปตั้งวันครบกำหนดถัดไปเองที่ตารางบำรุงรักษา`
                  : "ไม่ตรงกับรอบใด — บันทึกเป็นประวัติอย่างเดียว ไม่เลื่อนรอบ"}
              </div>
            )}

            {/* not <Field>: a <label> would name the first button "ผลการทำ" instead of its own text */}
            <div role="group" aria-labelledby="ma-result-label" className="flex flex-col gap-1.5">
              <span id="ma-result-label" className="text-[12px] font-medium text-muted">
                ผลการทำ
              </span>
              <div className="flex gap-2">
                {(
                  [
                    ["pass", "ผ่าน (Pass)", "border-green bg-green-bg text-green"],
                    ["fail", "ไม่ผ่าน (Fail)", "border-red bg-red-bg text-red"],
                    ["", "ไม่ระบุ", "border-ink/40 bg-bg-2 text-ink"],
                  ] as const
                ).map(([r, label, activeCls]) => (
                  <button
                    key={r || "none"}
                    type="button"
                    onClick={() => setResult(r)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-[13px] transition ${
                      result === r ? activeCls : "border-line text-muted hover:bg-bg"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <VendorSelect
              label="บริษัทภายนอกที่มาทำ (ไม่บังคับ)"
              value={vendorId}
              onChange={setVendorId}
              onError={(m) => pushToast(m, "red")}
            />

            <Field label="หมายเหตุ">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="เช่น เปลี่ยนซีลประตู"
                className="w-full resize-none rounded-lg border border-line bg-bg px-2.75 py-2 text-[13px] text-ink outline-none transition focus:border-teal"
              />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
