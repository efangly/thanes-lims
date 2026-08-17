"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

const TYPES = ["Blood", "Urine", "Water", "Tissue", "Food", "Serum"];

export function AddSampleModal() {
  const { activeModal, closeModal, addSample, pushToast } = useLims();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [custodian, setCustodian] = useState("");
  const [loc, setLoc] = useState("");

  const open = activeModal === "add-sample";

  const reset = () => {
    setName("");
    setType(TYPES[0]);
    setCustodian("");
    setLoc("");
  };

  const handleClose = () => {
    reset();
    closeModal();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !custodian.trim() || !loc.trim()) return;
    setSubmitting(true);
    try {
      await addSample({ name: name.trim(), type, custodian: custodian.trim(), loc: loc.trim() });
      pushToast("เพิ่มตัวอย่างเรียบร้อย");
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
      title="รับตัวอย่างใหม่"
      icon={<Icons.Sample />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            {submitting ? "กำลังบันทึก..." : "รับตัวอย่างเข้าระบบ"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อตัวอย่าง">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เลือด EDTA – ผู้ป่วยนอก" autoFocus />
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
        <Field label="ผู้ดูแลปัจจุบัน">
          <Input value={custodian} onChange={(e) => setCustodian(e.target.value)} placeholder="ชื่อผู้รับผิดชอบ" />
        </Field>
        <Field label="ตำแหน่งจัดเก็บ">
          <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="เช่น Fridge-A / R2-04" />
        </Field>
      </div>
    </Modal>
  );
}
