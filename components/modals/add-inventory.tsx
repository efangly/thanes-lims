"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Location } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { VendorSelect } from "@/components/vendor-select";
import { LocationField } from "@/components/location-field";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import type { ItemInput } from "@/lib/inventory-api";
import { useFullPath } from "@/lib/use-full-path";

const CATS = ["สารเคมี", "วัสดุสิ้นเปลือง", "รีเอเจนต์"];

/**
 * Dual-mode create / edit for an inventory item (Phase 7′). Same field set both
 * ways — only the endpoint differs. There is NO quantity field: stock enters
 * only through a lot (POST /inventory/{id}/receive), so after a create we offer
 * to jump to the receive page rather than firing a second, non-atomic request.
 */
export function AddInventoryModal() {
  const { activeModal, modalContext, closeModal, inventory, users, addInventoryItem, patchInventoryItem, pushToast } =
    useLims();
  const open = activeModal === "add-inventory";
  const existing = modalContext.inventoryItemId
    ? inventory.find((i) => i.id === modalContext.inventoryItemId) ?? null
    : null;

  const [name, setName] = useState("");
  const [cat, setCat] = useState(CATS[0]);
  const [unit, setUnit] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [custodianUserId, setCustodianUserId] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { path: existingLocPath } = useFullPath(existing?.locationId ?? null);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setCat(existing?.cat ?? CATS[0]);
    setUnit(existing?.unit ?? "");
    setMin(existing ? String(existing.min) : "");
    setMax(existing ? String(existing.max) : "");
    setCustodianUserId(existing?.custodianUserId ? String(existing.custodianUserId) : "");
    setManufacturer(existing?.manufacturer ?? "");
    setVendorId(existing?.vendorId ?? null);
    setLocation(null);
    setLocationId(existing?.locationId ?? null);
    setCreatedId(null);
  }, [open, existing]);

  const custodianName = useMemo(
    () => users.find((u) => String(u.id) === custodianUserId)?.name,
    [users, custodianUserId]
  );

  const valid = name.trim() && unit.trim() && custodianUserId && Number(max) > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    const input: ItemInput = {
      name: name.trim(),
      category: cat,
      unit: unit.trim(),
      min: Number(min) || 0,
      max: Number(max),
      custodianUserId: Number(custodianUserId),
      manufacturer: manufacturer.trim(),
      vendorId,
      locationId,
    };
    setSubmitting(true);
    try {
      if (existing) {
        await patchInventoryItem(existing.id, input);
        pushToast("บันทึกการแก้ไขแล้ว");
        closeModal();
      } else {
        const created = await addInventoryItem(input);
        pushToast("เพิ่มรายการสินค้าคงคลังเรียบร้อย");
        setCreatedId(created.id);
      }
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={existing ? "แก้ไขรายการสินค้าคงคลัง" : "เพิ่มรายการสินค้าคงคลัง"}
      icon={<Icons.Inventory />}
      size="md"
      footer={
        createdId ? undefined : (
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              ยกเลิก
            </Button>
            <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !valid}>
              <Icons.Plus className="h-[14px] w-[14px]" />
              {submitting ? "กำลังบันทึก..." : existing ? "บันทึก" : "เพิ่มรายการ"}
            </Button>
          </>
        )
      }
    >
      {createdId ? (
        <div className="flex flex-col gap-3.5 py-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-teal-d">
            <Icons.Check className="h-4 w-4" />
            สร้างรายการ {createdId} แล้ว — ยังไม่มีสต็อก รับของเข้าคลังเลยไหม?
          </div>
          <div className="flex gap-2">
            <Link href={`/inventory/receive?item=${createdId}`} onClick={closeModal}>
              <Button variant="teal" size="sm">
                รับของเข้าคลัง
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              ไว้ทีหลัง
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <Field label="ชื่อรายการ">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Methanol AR" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="หมวดหมู่">
              <Select value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {existing && !CATS.includes(existing.cat) && <option value={existing.cat}>{existing.cat}</option>}
              </Select>
            </Field>
            <Field label="ผู้ดูแล (บังคับ)">
              <Select value={custodianUserId} onChange={(e) => setCustodianUserId(e.target.value)}>
                <option value="">— เลือกผู้ดูแล —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
                {custodianUserId && !custodianName && <option value={custodianUserId}>ผู้ใช้ #{custodianUserId}</option>}
              </Select>
            </Field>
            <Field label="หน่วย">
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="เช่น L, kg, กล่อง" />
            </Field>
            <Field label="ผู้ผลิต (Manufacturer)">
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="ชื่อบนฉลาก" />
            </Field>
            <Field label="จุดสั่งซื้อขั้นต่ำ">
              <Input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" placeholder="เช่น 5" />
            </Field>
            <Field label="สต็อกสูงสุด">
              <Input value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" placeholder="เช่น 20" />
            </Field>
          </div>
          <VendorSelect value={vendorId} onChange={setVendorId} onError={(m) => pushToast(m, "red")} />
          <LocationField
            kind="equipment_storage"
            value={locationId}
            valueLabel={location?.name ?? existingLocPath}
            onChange={(loc) => {
              setLocation(loc);
              setLocationId(loc?.id ?? null);
            }}
          />
        </div>
      )}
    </Modal>
  );
}
