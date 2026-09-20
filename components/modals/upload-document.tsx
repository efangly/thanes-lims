"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useUiStore } from "@/lib/stores/ui-store";
import { apiErrorMessage } from "@/lib/api-client";

// value = the canonical document.Type the Go backend accepts (lowercase, see
// internal/domain/document/document.go); label = what the operator sees.
const TYPES = [
  { value: "sop", label: "SOP" },
  { value: "manual", label: "คู่มือ (Manual)" },
  { value: "policy", label: "นโยบาย (Policy)" },
  { value: "form", label: "แบบฟอร์ม (Form)" },
  { value: "record", label: "บันทึก (Record)" },
];
const ACCESS = ["ทั่วไป", "จำกัด – QA", "จำกัด – ผู้บริหาร"];

export function UploadDocumentModal() {
  const { addDocument } = useLims();
  const activeModal = useUiStore((s) => s.activeModal);
  const modalContext = useUiStore((s) => s.modalContext);
  const closeModal = useUiStore((s) => s.closeModal);
  const pushToast = useUiStore((s) => s.pushToast);
  const open = activeModal === "upload-document";
  // When opened from an equipment detail page the type is fixed (e.g. warranty)
  // and the doc is linked to that equipment — the pickers below are hidden.
  const presetType = modalContext.docType ?? null;
  const equipmentId = modalContext.equipmentId ?? null;
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0].value);
  const [access, setAccess] = useState(ACCESS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setType(TYPES[0].value);
    setAccess(ACCESS[0]);
    setFile(null);
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = async () => {
    if (!name.trim() || !file) return;
    setSubmitting(true);
    try {
      await addDocument(
        { name: name.trim(), type: presetType ?? type, access, equipmentId: equipmentId ?? undefined },
        file
      );
      pushToast("อัปโหลดเอกสารเรียบร้อย");
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
      title="อัปโหลดเอกสาร"
      icon={<Icons.Doc />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting}>
            <Icons.Plus className="h-3.5 w-3.5" />
            {submitting ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line bg-bg py-6 text-center transition hover:border-teal">
          <Icons.Doc className="h-6 w-6 text-muted-2" />
          <span className="text-[12.5px] text-muted">{file?.name || "คลิกเพื่อเลือกไฟล์ หรือวางไฟล์ที่นี่"}</span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Field label="ชื่อเอกสาร">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น SOP – การล้างเครื่องแก้ว" autoFocus />
        </Field>
        {presetType ? (
          <div className="rounded-lg border border-line bg-bg px-3 py-2.5 text-[12px] text-muted">
            {modalContext.docTypeLabel ?? presetType}
            {equipmentId && <span className="font-mono"> · แนบกับเครื่องมือ {equipmentId}</span>}
          </div>
        ) : (
          <>
            <Field label="ประเภทเอกสาร">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ระดับการเข้าถึง">
              <Select value={access} onChange={(e) => setAccess(e.target.value)}>
                {ACCESS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
