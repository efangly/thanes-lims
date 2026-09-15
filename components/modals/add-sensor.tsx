"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

export function AddSensorModal() {
  const { activeModal, closeModal } = useLims();
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
            ปิด
          </Button>
          {/* การสร้างเซนเซอร์ใหม่ (Gauge) ยังไม่มี endpoint บน backend — ดู docs/backend-requests.md */}
          <Button variant="teal" size="sm" disabled>
            <Icons.Plus className="h-[14px] w-[14px]" />
            เพิ่มเซนเซอร์ (เร็ว ๆ นี้)
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="text-[11.5px] text-muted">
          ยังไม่รองรับการสร้างเซนเซอร์ใหม่จากหน้านี้ — สำหรับอุปกรณ์ SMtrack ของ partner ใช้ปุ่ม
          &quot;เพิ่ม Partner Device&quot; ด้านล่างแทน (ผูกกับเซนเซอร์ที่ตั้งค่าไว้แล้วในระบบ)
        </p>
        <Field label="ชื่อ / ตำแหน่งติดตั้ง">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Freezer-C (-20°C)" disabled />
        </Field>
        <Field label="ประเภทเซนเซอร์">
          <Select value={type} onChange={(e) => setType(e.target.value)} disabled>
            <option value="Temperature">อุณหภูมิ</option>
            <option value="Humidity">ความชื้น</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เกณฑ์เฝ้าระวัง (Warn)">
            <Input value={warn} onChange={(e) => setWarn(e.target.value)} placeholder="เช่น -18" disabled />
          </Field>
          <Field label="เกณฑ์วิกฤต (Crit)">
            <Input value={crit} onChange={(e) => setCrit(e.target.value)} placeholder="เช่น -15" disabled />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
