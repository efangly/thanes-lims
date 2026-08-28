"use client";

import { useState } from "react";
import type { Location } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input } from "@/components/ui";
import { VendorSelect } from "@/components/vendor-select";
import { LocationField } from "@/components/location-field";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

export function AddEquipmentModal() {
  const { activeModal, closeModal, addEquipment, pushToast } = useLims();
  const open = activeModal === "add-equipment";
  const [name, setName] = useState("");
  const [next, setNext] = useState("");
  const [sn, setSn] = useState("");
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [installDate, setInstallDate] = useState("");
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setNext("");
    setSn("");
    setCategory("");
    setManufacturer("");
    setModel("");
    setInstallDate("");
    setVendorId(null);
    setLocation(null);
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = async () => {
    if (!name.trim() || !next.trim()) return;
    setSubmitting(true);
    try {
      await addEquipment({
        name: name.trim(),
        next,
        sn: sn.trim(),
        category: category.trim(),
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        installDate: installDate || null,
        vendorId,
        locationId: location?.id ?? null,
      });
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
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !name.trim() || !next.trim()}>
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Serial Number (S/N)">
            <Input value={sn} onChange={(e) => setSn(e.target.value)} />
          </Field>
          <Field label="ประเภท (Category)">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="เช่น Centrifuge" />
          </Field>
          <Field label="ผู้ผลิต (Manufacturer)">
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
          </Field>
          <Field label="รุ่น (Model)">
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
          <Field label="วันที่ติดตั้ง (Installation Date)">
            <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} />
          </Field>
          <Field label="วันสอบเทียบถัดไป">
            <Input type="date" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
        </div>
        <VendorSelect value={vendorId} onChange={setVendorId} onError={(m) => pushToast(m, "red")} />
        <LocationField
          kind="equipment_storage"
          value={location?.id ?? null}
          valueLabel={location?.name ?? null}
          onChange={setLocation}
        />
      </div>
    </Modal>
  );
}
