"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select, Seg } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { createPartnerDevice } from "@/lib/partner-devices-api";

/** Admin-only form to map a third-party SMtrack device Serial to an existing Gauge Location (backend ADR 0011). */
export function AddPartnerDeviceModal() {
  const { activeModal, closeModal, pushToast, modalContext } = useLims();
  const open = activeModal === "add-partner-device";
  const locations = modalContext.gaugeLocations ?? [];

  const [serial, setSerial] = useState("");
  const [location, setLocation] = useState("");
  const [activeIdx, setActiveIdx] = useState(0); // 0 = ใช้งาน, 1 = ปิดใช้งาน
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSerial("");
    setLocation("");
    setActiveIdx(0);
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = async () => {
    if (!serial.trim() || !location) return;
    setSubmitting(true);
    try {
      await createPartnerDevice({ serial: serial.trim(), location, active: activeIdx === 0 });
      pushToast(`ผูก Partner Device "${serial.trim()}" กับ ${location} เรียบร้อย`);
      modalContext.onPartnerDeviceCreated?.();
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
      title="เพิ่ม Partner Device"
      icon={<Icons.Env />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !serial.trim() || !location}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            {submitting ? "กำลังบันทึก..." : "เพิ่ม Partner Device"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Serial (จาก SMtrack)">
          <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="เช่น SN-00042" autoFocus />
        </Field>
        <Field label="ผูกกับ Location (ต้องมี Gauge อยู่แล้ว)">
          <Select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">เลือก Location</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="สถานะ">
          <Seg options={["ใช้งาน", "ปิดใช้งาน"]} value={activeIdx} onChange={setActiveIdx} />
        </Field>
      </div>
    </Modal>
  );
}
