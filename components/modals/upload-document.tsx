"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

const TYPES = ["SOP", "Manual", "Policy", "Form", "Record"];
const ACCESS = ["ทั่วไป", "จำกัด – QA", "จำกัด – ผู้บริหาร"];

export function UploadDocumentModal() {
  const { activeModal, closeModal, addDocument, pushToast } = useLims();
  const open = activeModal === "upload-document";
  const [name, setName] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [access, setAccess] = useState(ACCESS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setType(TYPES[0]);
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
      await addDocument({ name: name.trim(), type, access }, file);
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
            <Icons.Plus className="h-[14px] w-[14px]" />
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
        <Field label="ประเภทเอกสาร">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
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
      </div>
    </Modal>
  );
}
