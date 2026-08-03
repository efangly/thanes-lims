"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

export function AddSensorModal() {
  const { activeModal, closeModal, pushToast } = useLims();
  const open = activeModal === "add-sensor";
  const [name, setName] = useState("");
  const [type, setType] = useState("Temperature");
  const [warn, setWarn] = useState("");
  const [crit, setCrit] = useState("");

  const reset = () => {
    setName("");
    setType("Temperature");
    setWarn("");
    setCrit("");
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = () => {
    if (!name.trim()) return;
    pushToast(`เพิ่มเซนเซอร์ "${name.trim()}" เรียบร้อย — กำลังจับคู่อุปกรณ์`);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มเซนเซอร์"
      icon={<Icons.Env />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            เพิ่มเซนเซอร์
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อ / ตำแหน่งติดตั้ง">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Freezer-C (-20°C)" autoFocus />
        </Field>
        <Field label="ประเภทเซนเซอร์">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Temperature">อุณหภูมิ</option>
            <option value="Humidity">ความชื้น</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เกณฑ์เฝ้าระวัง (Warn)">
            <Input value={warn} onChange={(e) => setWarn(e.target.value)} placeholder="เช่น -18" />
          </Field>
          <Field label="เกณฑ์วิกฤต (Crit)">
            <Input value={crit} onChange={(e) => setCrit(e.target.value)} placeholder="เช่น -15" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
