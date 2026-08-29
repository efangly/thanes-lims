"use client";

import { useState } from "react";
import type { Location, Sample } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { LocationPicker } from "@/components/location-picker";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

export function PutAwaySampleModal({ sample, open, onClose }: { sample: Sample | null; open: boolean; onClose: () => void }) {
  const { putAwaySample, pushToast } = useLims();
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (location: Location, position?: string) => {
    if (!sample) return;
    setSubmitting(true);
    try {
      await putAwaySample(sample.id, location.id, position);
      pushToast(`จัดเก็บ ${sample.id} ที่ ${location.name}${position ? ` ช่อง ${position}` : ""} เรียบร้อย`);
      onClose();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="จัดเก็บตำแหน่งตัวอย่าง" icon={<Icons.Loc />} size="sm">
      {sample && (
        <div className="mb-3.5 rounded-lg border border-line bg-bg px-3.5 py-2.5">
          <div className="font-mono text-[12.5px] font-medium text-ink">{sample.id}</div>
          <div className="text-[13px]">{sample.name}</div>
        </div>
      )}
      <div className="relative">
        <LocationPicker onSelect={handleSelect} disabled={submitting} emptyLeavesOnly enableScan />
        {submitting && (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-panel/70 text-[12.5px] text-muted">
            กำลังบันทึก…
          </div>
        )}
      </div>
    </Modal>
  );
}
