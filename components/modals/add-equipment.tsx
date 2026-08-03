"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import type { Equipment, Tag as TagType } from "@/lib/data";

function statusFor(cal: number): TagType {
  if (cal > 60) return { tone: "green", label: "พร้อมใช้" };
  if (cal > 25) return { tone: "amber", label: "ใกล้สอบเทียบ" };
  return { tone: "red", label: "เลยกำหนด" };
}

export function AddEquipmentModal() {
  const { activeModal, closeModal, equipment, addEquipment, pushToast } = useLims();
  const open = activeModal === "add-equipment";
  const [name, setName] = useState("");
  const [next, setNext] = useState("");
  const [cal, setCal] = useState(80);

  const reset = () => {
    setName("");
    setNext("");
    setCal(80);
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = () => {
    if (!name.trim() || !next.trim()) return;
    const id = `EQ-NEW-${String(equipment.length + 1).padStart(3, "0")}`;
    const e: Equipment = { id, name: name.trim(), cal, next: next.trim(), status: statusFor(cal), usage: "0 ชม." };
    addEquipment(e);
    pushToast("เพิ่มเครื่องมือเรียบร้อย");
    handleClose();
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
          <Button variant="teal" size="sm" onClick={handleSubmit}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            เพิ่มเครื่องมือ
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อเครื่องมือ">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เครื่องปั่นเหวี่ยง Hettich" autoFocus />
        </Field>
        <Field label="วันสอบเทียบถัดไป">
          <Input value={next} onChange={(e) => setNext(e.target.value)} placeholder="เช่น 12 ส.ค. 2569" />
        </Field>
        <Field label={`เปอร์เซ็นต์อายุการสอบเทียบคงเหลือ (${cal}%)`}>
          <input
            type="range"
            min={0}
            max={100}
            value={cal}
            onChange={(e) => setCal(Number(e.target.value))}
            className="accent-teal"
          />
        </Field>
      </div>
    </Modal>
  );
}
