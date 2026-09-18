"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select, Seg } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { updatePartnerDevice } from "@/lib/partner-devices-api";

/**
 * Admin-only edit for an existing Serial<->Location mapping. `PATCH
 * /partner-devices/:serial` is not partial - it replaces location+active
 * wholesale, and an omitted `active` defaults to `false` - so this form
 * always sends both fields, seeded from the mapping's current values.
 * There's no delete endpoint; setting active=ปิดใช้งาน is the only way to
 * stop polling without losing the mapping.
 */
export function EditPartnerDeviceModal() {
  const { activeModal, closeModal, pushToast, modalContext } = useLims();
  const open = activeModal === "edit-partner-device";
  const device = modalContext.editingPartnerDevice;
  const locations = modalContext.gaugeLocations ?? [];

  const [location, setLocation] = useState("");
  const [activeIdx, setActiveIdx] = useState(0); // 0 = ใช้งาน, 1 = ปิดใช้งาน
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !device) return;
    setLocation(device.location);
    setActiveIdx(device.active ? 0 : 1);
  }, [open, device]);

  const handleClose = () => closeModal();

  const handleSubmit = async () => {
    if (!device || !location) return;
    setSubmitting(true);
    try {
      await updatePartnerDevice(device.serial, { location, active: activeIdx === 0 });
      pushToast(`แก้ไข SMTrack+ Device "${device.serial}" เรียบร้อย`);
      modalContext.onPartnerDeviceUpdated?.();
      handleClose();
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  if (!device) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="แก้ไข SMTrack+ Device"
      icon={<Icons.Env />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !location}>
            <Icons.Check className="h-3.5 w-3.5" />
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Serial">
          <Input value={device.serial} disabled className="font-mono" />
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
        <p className="text-[11px] text-muted-2">
          ไม่มีการลบ mapping — ปิดใช้งานจะหยุด poll ชั่วคราวโดยไม่ลบข้อมูล
        </p>
      </div>
    </Modal>
  );
}
