"use client";

import { useMemo, useState } from "react";
import type { Location, Sample } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Tag } from "@/components/ui";
import { ScanInput } from "@/components/scan-input";
import { LocationPicker } from "@/components/location-picker";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { searchSamples } from "@/lib/samples-api";

/**
 * Move a sample into storage by scanning (requirement 1.3). Two steps:
 * scan the tube's barcode to pull up the sample, then scan/drill to a free leaf
 * — the destination must be an unoccupied leaf, which the backend enforces too.
 * Replaces the old fake "scanning…" animation that picked a random sample.
 */
export function ScanBarcodeModal() {
  const { activeModal, closeModal, users, putAwaySample, pushToast } = useLims();
  const open = activeModal === "scan-barcode";
  const [sample, setSample] = useState<Sample | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const handleClose = () => {
    setSample(null);
    closeModal();
  };

  const handleScanSample = async (code: string) => {
    try {
      const rows = await searchSamples({ barcodeId: code }, nameById);
      if (rows.length === 0) {
        pushToast(`ไม่พบตัวอย่างที่มีบาร์โค้ด ${code}`, "red");
        return false;
      }
      setSample(rows[0]);
      return true;
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
      return false;
    }
  };

  const handleSelectLocation = async (location: Location, position?: string) => {
    if (!sample) return;
    setSubmitting(true);
    try {
      await putAwaySample(sample.id, location.id, position);
      pushToast(`ย้าย ${sample.id} ไปที่ ${location.name}${position ? ` ช่อง ${position}` : ""} เรียบร้อย`);
      handleClose();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="ย้ายตำแหน่งตัวอย่าง (สแกน)" icon={<Icons.Arrow />} size="sm">
      {!sample ? (
        <div className="flex flex-col gap-3 py-2">
          <ScanInput onScan={handleScanSample} autoFocus label="สแกนบาร์โค้ดตัวอย่าง" />
          <p className="text-[12px] text-muted-2">
            สแกนบาร์โค้ดบนหลอด/ภาชนะตัวอย่าง แล้วเลือกตำแหน่งจัดเก็บปลายทางในขั้นถัดไป
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between rounded-lg border border-line bg-bg px-3.5 py-2.5">
            <div>
              <div className="font-mono text-[12.5px] font-medium text-ink">{sample.id}</div>
              <div className="text-[13px]">{sample.name}</div>
            </div>
            <Tag {...sample.status} />
          </div>
          <div className="relative">
            <LocationPicker onSelect={handleSelectLocation} disabled={submitting} emptyLeavesOnly enableScan />
            {submitting && (
              <div className="absolute inset-0 grid place-items-center rounded-lg bg-panel/70 text-[12.5px] text-muted">
                กำลังบันทึก…
              </div>
            )}
          </div>
          <button
            onClick={() => setSample(null)}
            className="self-start text-[12px] text-muted underline-offset-2 hover:underline"
          >
            ← สแกนตัวอย่างอื่น
          </button>
        </div>
      )}
    </Modal>
  );
}
