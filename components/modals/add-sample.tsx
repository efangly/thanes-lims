"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import {
  loadStickerPrefs,
  openStickerInNewTab,
  saveStickerPrefs,
  STICKER_SYMBOLOGIES,
  STICKER_TEMPLATES,
} from "@/lib/samples-api";

const TYPES = ["Blood", "Urine", "Water", "Tissue", "Food", "Serum"];

/**
 * รับตัวอย่างใหม่ — 2 ขั้น (ADR: modal 2 ขั้น "สร้างก่อน แล้วค่อยแนบ/พิมพ์"):
 *   ขั้น 1  ข้อมูลตัวอย่าง → POST /samples (สร้าง id ก่อน)
 *   ขั้น 2  บาร์โค้ด & สติ๊กเกอร์ → Gen (POST /samples/{id}/barcode) + เปิด PDF พิมพ์เอง
 *
 * Barcode ID ที่พิมพ์ไว้บนหลอดอยู่แล้วกรอกในขั้น 1 (backend รับ barcode_id เฉพาะตอน create —
 * ไม่มี endpoint ตั้งรหัสเองหลังสร้าง) ส่วนปุ่ม Gen อยู่ขั้น 2
 */
export function AddSampleModal() {
  const { activeModal, closeModal, addSample, genSampleBarcode, pushToast, users } = useLims();
  const open = activeModal === "add-sample";

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [custodianId, setCustodianId] = useState("");
  const [description, setDescription] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [sampleId, setSampleId] = useState<string | null>(null);
  const [barcodeId, setBarcodeId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [prefs, setPrefs] = useState({ template: "medium", symbology: "code128" });
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (open) setPrefs(loadStickerPrefs());
  }, [open]);

  const reset = () => {
    setStep(1);
    setName("");
    setType(TYPES[0]);
    setCustodianId("");
    setDescription("");
    setBarcodeInput("");
    setSampleId(null);
    setBarcodeId(null);
  };

  const handleClose = () => {
    reset();
    closeModal();
  };

  const handleCreate = async () => {
    if (!name.trim() || !custodianId) return;
    setSubmitting(true);
    try {
      const created = await addSample({
        name: name.trim(),
        type,
        custodianUserId: Number(custodianId),
        description: description.trim(),
        barcodeId: barcodeInput.trim() || undefined,
      });
      setSampleId(created.id);
      setBarcodeId(created.barcodeId);
      setStep(2);
      pushToast(`รับตัวอย่าง ${created.id} เข้าระบบแล้ว`);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!sampleId) return;
    setGenerating(true);
    try {
      const updated = await genSampleBarcode(sampleId);
      setBarcodeId(updated.barcodeId);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!sampleId) return;
    setPrinting(true);
    try {
      saveStickerPrefs(prefs);
      await openStickerInNewTab(sampleId, prefs);
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 1 ? "รับตัวอย่างใหม่" : "บาร์โค้ด & สติ๊กเกอร์"}
      icon={<Icons.Sample />}
      size="sm"
      footer={
        step === 1 ? (
          <>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button
              variant="teal"
              size="sm"
              onClick={handleCreate}
              disabled={submitting || !name.trim() || !custodianId}
            >
              <Icons.Plus className="h-[14px] w-[14px]" />
              {submitting ? "กำลังบันทึก..." : "บันทึก แล้วไปต่อ"}
            </Button>
          </>
        ) : (
          <Button variant="teal" size="sm" onClick={handleClose}>
            <Icons.Check className="h-[14px] w-[14px]" />
            เสร็จสิ้น
          </Button>
        )
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-3.5">
          <Field label="ชื่อตัวอย่าง">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น เลือด EDTA – ผู้ป่วยนอก"
              autoFocus
            />
          </Field>
          <Field label="ประเภทตัวอย่าง">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="รายละเอียดเพิ่มเติม (Description)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="เช่น ปริมาตร แหล่งที่มา ข้อควรระวัง"
              className="w-full resize-none rounded-lg border border-line bg-bg px-[11px] py-2 text-[13px] text-ink outline-none transition focus:border-teal"
            />
          </Field>
          <Field label="ผู้ดูแลปัจจุบัน">
            <Select value={custodianId} onChange={(e) => setCustodianId(e.target.value)}>
              <option value="" disabled>
                เลือกผู้รับผิดชอบ
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Barcode ID (ถ้ามีรหัสพิมพ์บนหลอดอยู่แล้ว — ไม่บังคับ)">
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="เว้นว่างไว้แล้วกด Gen ในขั้นถัดไป"
              className="font-mono"
            />
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-line bg-bg px-3.5 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.6px] text-muted">รหัสตัวอย่าง</div>
            <div className="font-mono text-[13px] font-semibold text-ink">{sampleId}</div>
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted">Barcode ID</div>
            {barcodeId ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-teal-bg px-3.5 py-2.5 font-mono text-[13px] font-semibold text-teal-d">
                <Icons.Check className="h-4 w-4" />
                {barcodeId}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3.5 py-2.5">
                <span className="text-[12.5px] text-muted">ตัวอย่างนี้ยังไม่มี Barcode ID</span>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating}>
                  <Icons.Bolt className="h-[13px] w-[13px]" />
                  {generating ? "กำลังสร้าง…" : "Gen"}
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-line pt-3.5">
            <div className="mb-2 text-[12px] font-medium text-muted">พิมพ์สติ๊กเกอร์</div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="ขนาดสติ๊กเกอร์">
                <Select
                  value={prefs.template}
                  onChange={(e) => setPrefs((p) => ({ ...p, template: e.target.value }))}
                >
                  {STICKER_TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="รูปแบบบาร์โค้ด">
                <Select
                  value={prefs.symbology}
                  onChange={(e) => setPrefs((p) => ({ ...p, symbology: e.target.value }))}
                >
                  {STICKER_SYMBOLOGIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button variant="ink" size="sm" className="mt-3 w-full justify-center" onClick={handlePrint} disabled={printing}>
              <Icons.Doc className="h-[14px] w-[14px]" />
              {printing ? "กำลังเตรียม PDF…" : "เปิดสติ๊กเกอร์ (PDF) ในแท็บใหม่"}
            </Button>
            <p className="mt-2 text-[11.5px] text-muted-2">
              เปิดในแท็บใหม่แล้วสั่งพิมพ์เอง เพื่อเลือกขนาดกระดาษให้ตรงกับสติ๊กเกอร์
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
