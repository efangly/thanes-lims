"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useUiStore } from "@/lib/stores/ui-store";
import { apiErrorMessage } from "@/lib/api-client";
import type { TestResult } from "@/lib/data";

const FLAGS: { value: TestResult["flag"]; label: string }[] = [
  { value: "ok", label: "ปกติ (OK)" },
  { value: "hi", label: "สูงกว่าช่วงอ้างอิง (HI)" },
  { value: "lo", label: "ต่ำกว่าช่วงอ้างอิง (LO)" },
];

/** บันทึกผลการทดสอบ — ย้ายสถานะจาก `analyzing` ไป `pending_verification` (PATCH /tests/{id}/result). */
export function SubmitTestResultModal() {
  const { tests, submitTestResult } = useLims();
  const activeModal = useUiStore((s) => s.activeModal);
  const modalContext = useUiStore((s) => s.modalContext);
  const closeModal = useUiStore((s) => s.closeModal);
  const pushToast = useUiStore((s) => s.pushToast);
  const open = activeModal === "submit-test-result";
  const testResultId = modalContext.testResultId ?? null;
  const test = testResultId ? tests.find((t) => t.id === testResultId) ?? null : null;

  const [result, setResult] = useState("");
  const [flag, setFlag] = useState<TestResult["flag"]>("ok");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setResult("");
      setFlag("ok");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!testResultId || !result.trim()) return;
    setSubmitting(true);
    try {
      await submitTestResult(testResultId, result.trim(), flag);
      pushToast(`บันทึกผล ${testResultId} แล้ว รอทวนสอบ`);
      closeModal();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title="บันทึกผลการทดสอบ" icon={<Icons.Test />} size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={closeModal}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !result.trim()}>
            <Icons.Check className="h-3.5 w-3.5" />
            {submitting ? "กำลังบันทึก..." : "บันทึกผล"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="rounded-lg border border-line bg-bg px-3.5 py-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.6px] text-muted">รายการทดสอบ</div>
          <div className="font-mono text-[13px] font-semibold text-ink">{test?.test ?? testResultId}</div>
          <div className="mt-1 text-[11.5px] text-muted">
            ตัวอย่าง {test?.sample ?? "—"} · ช่วงอ้างอิง {test?.ref || "—"}
          </div>
        </div>
        <Field label="ผลการทดสอบ">
          <Input
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="เช่น 5.2 mg/dL"
            className="font-mono"
            autoFocus
          />
        </Field>
        <Field label="Flag">
          <Select value={flag} onChange={(e) => setFlag(e.target.value as TestResult["flag"])}>
            {FLAGS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
