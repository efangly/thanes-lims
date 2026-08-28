"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/backend-mappers";
import {
  listEquipmentSchedules,
  recordCalibration,
  latestCalibrationEventId,
  type CalibrationSchedule,
} from "@/lib/equipment-api";

/**
 * Log a calibration result (requirement 2.2). Step 1: pick equipment + which
 * Schedule the result belongs to + the measured / acceptance values + pass/fail.
 * The next-due date is NOT an input — it comes from the chosen Schedule (ADR-0006).
 * Step 2: attach the certificate, handed off to the upload-document modal.
 */
export function RecordCalibrationModal() {
  const { activeModal, modalContext, closeModal, openModal, equipment, pushToast } = useLims();
  const open = activeModal === "record-calibration";
  const preset = modalContext.equipmentId ?? null;

  const [equipmentId, setEquipmentId] = useState<string | null>(preset);
  const [search, setSearch] = useState("");
  const [schedules, setSchedules] = useState<CalibrationSchedule[] | null>(null);
  const [scheduleId, setScheduleId] = useState("");
  const [measured, setMeasured] = useState("");
  const [acceptance, setAcceptance] = useState("");
  const [result, setResult] = useState<"pass" | "fail">("pass");
  const [submitting, setSubmitting] = useState(false);
  const [savedEventId, setSavedEventId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setEquipmentId(preset);
    setSearch("");
    setSchedules(null);
    setScheduleId("");
    setMeasured("");
    setAcceptance("");
    setResult("pass");
    setSavedEventId(null);
  }, [open, preset]);

  useEffect(() => {
    if (!equipmentId) {
      setSchedules(null);
      return;
    }
    let cancelled = false;
    listEquipmentSchedules(equipmentId)
      .then((s) => {
        if (cancelled) return;
        setSchedules(s);
        setScheduleId(s[0] ? String(s[0].id) : "");
      })
      .catch(() => !cancelled && setSchedules([]));
    return () => {
      cancelled = true;
    };
  }, [equipmentId]);

  const eq = equipment.find((e) => e.id === equipmentId) ?? null;
  const schedule = schedules?.find((s) => String(s.id) === scheduleId) ?? null;

  const matches = useMemo(() => {
    const n = search.trim().toLowerCase();
    if (!n) return equipment.slice(0, 8);
    return equipment.filter((e) => e.name.toLowerCase().includes(n) || e.sn.toLowerCase().includes(n)).slice(0, 8);
  }, [search, equipment]);

  const submit = async () => {
    if (!equipmentId || !schedule) return;
    setSubmitting(true);
    try {
      await recordCalibration(equipmentId, {
        nextCalibrationDue: schedule.nextDueDate,
        calibrationType: schedule.label,
        calibrateValue: measured.trim(),
        acceptanceValue: acceptance.trim(),
        result,
      });
      const eventId = await latestCalibrationEventId(equipmentId);
      setSavedEventId(eventId);
      pushToast("บันทึกผลสอบเทียบแล้ว");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title="บันทึกผลสอบเทียบ" icon={<Icons.Check />} size="md">
      {savedEventId !== null ? (
        <div className="flex flex-col gap-3.5 py-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-teal-d">
            <Icons.Check className="h-4 w-4" />
            บันทึกผลเรียบร้อย — ขั้นต่อไปแนบใบรับรอง (Certificate)
          </div>
          <div className="flex gap-2">
            <Button
              variant="teal"
              size="sm"
              onClick={() =>
                openModal("upload-document", {
                  calibrationEventId: savedEventId,
                  equipmentId: equipmentId ?? undefined,
                  docType: "certificate",
                  docTypeLabel: "ประเภท: ใบรับรองสอบเทียบ (Certificate)",
                })
              }
            >
              แนบใบรับรอง
            </Button>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              ไว้ทีหลัง
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {!eq ? (
            <Field label="เลือกเครื่องมือ (ค้นด้วยชื่อ หรือ S/N)">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="พิมพ์เพื่อค้นหา" autoFocus />
              <div className="mt-1.5 max-h-[200px] overflow-y-auto rounded-lg border border-line">
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
          )}

          {eq && schedules !== null && schedules.length === 0 && (
            <div className="rounded-lg border border-amber bg-amber-bg px-3.5 py-3 text-[12.5px] text-amber">
              เครื่องนี้ยังไม่มีรอบสอบเทียบ — ต้องเพิ่มรอบก่อนจึงบันทึกผลได้ (วันครบกำหนดถัดไปมาจากรอบ){" "}
              <Link href={`/equipment/${eq.id}`} className="font-medium underline">
                ไปหน้าเครื่องมือ
              </Link>
            </div>
          )}

          {eq && schedules && schedules.length > 0 && (
            <>
              <Field label="ประเภทการสอบเทียบ (เลือกจากรอบ)">
                <Select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — ครบกำหนด {formatDate(s.nextDueDate)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ค่าที่วัดได้">
                  <Input value={measured} onChange={(e) => setMeasured(e.target.value)} />
                </Field>
                <Field label="ค่ายอมรับ">
                  <Input value={acceptance} onChange={(e) => setAcceptance(e.target.value)} />
                </Field>
              </div>
              <Field label="ผล">
                <div className="flex gap-2">
                  {(["pass", "fail"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setResult(r)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-[13px] transition ${
                        result === r
                          ? r === "pass"
                            ? "border-green bg-green-bg text-green"
                            : "border-red bg-red-bg text-red"
                          : "border-line text-muted hover:bg-bg"
                      }`}
                    >
                      {r === "pass" ? "ผ่าน (Pass)" : "ไม่ผ่าน (Fail)"}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="rounded-lg border border-line bg-bg px-3 py-2 text-[11.5px] text-muted">
                วันครบกำหนดถัดไปจะใช้จากรอบที่เลือก
                {schedule && ` (${formatDate(schedule.nextDueDate)})`} — ไม่ต้องกรอกเอง (ADR-0006)
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  ยกเลิก
                </Button>
                <Button variant="teal" size="sm" onClick={submit} disabled={submitting || !schedule}>
                  {submitting ? "กำลังบันทึก..." : "บันทึกผล"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
