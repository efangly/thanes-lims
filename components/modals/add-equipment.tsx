"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

export function AddEquipmentModal() {
  const { activeModal, closeModal, addEquipment, pushToast } = useLims();
  const open = activeModal === "add-equipment";
  const [name, setName] = useState("");
  const [next, setNext] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setNext("");
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = async () => {
    if (!name.trim() || !next.trim()) return;
    setSubmitting(true);
    try {
      await addEquipment({ name: name.trim(), next });
      pushToast("เพิ่มเครื่องมือเรียบร้อย");
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
      title="เพิ่มเครื่องมือ"
      icon={<Icons.Equipment />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            {submitting ? "กำลังบันทึก..." : "เพิ่มเครื่องมือ"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อเครื่องมือ">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เครื่องปั่นเหวี่ยง Hettich" autoFocus />
        </Field>
        <Field label="วันสอบเทียบถัดไป">
          <Input type="date" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
