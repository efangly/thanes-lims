"use client";

import { useState } from "react";
import type { Location, Sample } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

/** The reverse direction of put-away: pick a sample to move into an already-selected leaf. */
export function AssignSampleToLocationModal({
  location,
  candidates,
  open,
  onClose,
}: {
  location: Location | null;
  candidates: Sample[];
  open: boolean;
  onClose: () => void;
}) {
  const { putAwaySample, pushToast } = useLims();
  const [sampleId, setSampleId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentSampleId = sampleId || candidates[0]?.id || "";

  const handleClose = () => {
    setSampleId("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!location || !currentSampleId) return;
    setSubmitting(true);
    try {
      await putAwaySample(currentSampleId, location.id);
      pushToast(`ผูก ${currentSampleId} เข้าที่ ${location.name} เรียบร้อย`);
      handleClose();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`ผูก Sample เข้าที่ ${location?.name ?? ""}`}
      icon={<Icons.Sample />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !currentSampleId}>
            {submitting ? "กำลังบันทึก..." : "ผูก Sample"}
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <div className="py-4 text-center text-[12.5px] text-muted">ไม่มี sample ที่ยังไม่ถูกจัดเก็บ</div>
      ) : (
        <Field label="Sample">
          <Select value={currentSampleId} onChange={(e) => setSampleId(e.target.value)}>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </Modal>
  );
}
