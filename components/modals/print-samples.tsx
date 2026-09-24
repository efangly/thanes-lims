"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Select } from "@/components/ui";
import { useUiStore } from "@/lib/stores/ui-store";
import { apiErrorMessage } from "@/lib/api-client";
import {
  loadStickerPrefs,
  openStickersInNewTab,
  saveStickerPrefs,
  STICKER_SYMBOLOGIES,
  STICKER_TEMPLATES,
} from "@/lib/samples-api";

/**
 * พิมพ์สติ๊กเกอร์บาร์โค้ดของหลายตัวอย่างพร้อมกัน — รวมเป็น PDF เดียวฝั่ง client
 * (ดู `openStickersInNewTab`) เพราะ backend ยังไม่มี batch endpoint ให้เรียก
 * ครั้งเดียว ใช้ template/symbology เดียวกันทั้งชุด เหมือนตอนตั้งกระดาษสติ๊กเกอร์
 * บนเครื่องพิมพ์ครั้งเดียวแล้วพิมพ์ยาว
 */
export function PrintSamplesModal() {
  const activeModal = useUiStore((s) => s.activeModal);
  const modalContext = useUiStore((s) => s.modalContext);
  const closeModal = useUiStore((s) => s.closeModal);
  const pushToast = useUiStore((s) => s.pushToast);
  const open = activeModal === "print-samples";
  const sampleIds = modalContext.sampleIds ?? [];

  const [prefs, setPrefs] = useState({ template: "medium", symbology: "code128" });
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (open) setPrefs(loadStickerPrefs());
  }, [open]);

  const handlePrint = async () => {
    if (sampleIds.length === 0) return;
    setPrinting(true);
    try {
      saveStickerPrefs(prefs);
      await openStickersInNewTab(sampleIds, prefs);
      pushToast(`เปิดสติ๊กเกอร์ ${sampleIds.length} ตัวอย่างสำหรับพิมพ์แล้ว`);
      modalContext.onPrinted?.();
      closeModal();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="พิมพ์บาร์โค้ดหลายตัวอย่าง"
      icon={<Icons.Printer />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={closeModal}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handlePrint} disabled={printing || sampleIds.length === 0}>
            <Icons.Printer className="h-3.5 w-3.5" />
            {printing ? "กำลังเตรียม PDF…" : `พิมพ์ (${sampleIds.length})`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-muted">ตัวอย่างที่เลือก ({sampleIds.length})</div>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-line bg-bg px-3.5 py-2.5">
            {sampleIds.map((id) => (
              <div key={id} className="py-0.5 font-mono text-[12.5px] text-ink">
                {id}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[12px] font-medium text-muted">ตั้งค่าสติ๊กเกอร์ (ใช้ร่วมกันทั้งชุด)</div>
          <div className="grid grid-cols-1 gap-3">
            <Field label="ขนาดสติ๊กเกอร์">
              <Select value={prefs.template} onChange={(e) => setPrefs((p) => ({ ...p, template: e.target.value }))}>
                {STICKER_TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="รูปแบบบาร์โค้ด">
              <Select value={prefs.symbology} onChange={(e) => setPrefs((p) => ({ ...p, symbology: e.target.value }))}>
                {STICKER_SYMBOLOGIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}
