"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

export function OpenTestOrderModal() {
  const { activeModal, closeModal, samples, addTest, pushToast } = useLims();
  const open = activeModal === "open-test-order";
  const [sampleId, setSampleId] = useState("");
  const [test, setTest] = useState("");
  const [analyst, setAnalyst] = useState("");
  const [ref, setRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentSample = sampleId || samples[0]?.id || "";

  const reset = () => {
    setSampleId("");
    setTest("");
    setAnalyst("");
    setRef("");
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = async () => {
    if (!test.trim() || !analyst.trim()) return;
    setSubmitting(true);
    try {
      await addTest({ sample: currentSample, test: test.trim(), analyst: analyst.trim(), ref: ref.trim() || "—" });
      pushToast("เปิดคำสั่งทดสอบเรียบร้อย");
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
      title="เปิดคำสั่งทดสอบ"
      icon={<Icons.Test />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            {submitting ? "กำลังบันทึก..." : "เปิดคำสั่งทดสอบ"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ตัวอย่าง">
          <Select value={currentSample} onChange={(e) => setSampleId(e.target.value)}>
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="รายการทดสอบ">
          <Input value={test} onChange={(e) => setTest(e.target.value)} placeholder="เช่น CBC – Complete Blood Count" autoFocus />
        </Field>
        <Field label="ผู้วิเคราะห์">
          <Input value={analyst} onChange={(e) => setAnalyst(e.target.value)} placeholder="ชื่อผู้วิเคราะห์" />
        </Field>
        <Field label="ช่วงอ้างอิง">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="เช่น 4.0–10.0 ×10⁹/L" />
        </Field>
      </div>
    </Modal>
  );
}
