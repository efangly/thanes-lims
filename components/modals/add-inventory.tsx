"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import type { InventoryItem, Tag as TagType } from "@/lib/data";

const CATS = ["สารเคมี", "วัสดุสิ้นเปลือง", "รีเอเจนต์"];

function statusFor(pct: number): TagType {
  if (pct < 20) return { tone: "red", label: "สั่งซื้อด่วน" };
  if (pct < 35) return { tone: "amber", label: "ใกล้หมด" };
  return { tone: "green", label: "เพียงพอ" };
}

export function AddInventoryModal() {
  const { activeModal, closeModal, inventory, addInventoryItem, pushToast } = useLims();
  const open = activeModal === "add-inventory";
  const [name, setName] = useState("");
  const [cat, setCat] = useState(CATS[0]);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const reset = () => {
    setName("");
    setCat(CATS[0]);
    setQty("");
    setUnit("");
    setMin("");
    setMax("");
  };
  const handleClose = () => {
    reset();
    closeModal();
  };
  const handleSubmit = () => {
    const q = Number(qty);
    const mx = Number(max);
    const mn = Number(min);
    if (!name.trim() || !unit.trim() || !mx || !q) return;
    const pct = Math.round((q / mx) * 100);
    const id = `NEW-${String(inventory.length + 1).padStart(4, "0")}`;
    const item: InventoryItem = { id, name: name.trim(), cat, qty: q, unit: unit.trim(), min: mn, max: mx, pct, status: statusFor(pct) };
    addInventoryItem(item);
    pushToast("เพิ่มรายการสินค้าคงคลังเรียบร้อย");
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มรายการสินค้าคงคลัง"
      icon={<Icons.Inventory />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            เพิ่มรายการ
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อรายการ">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Methanol AR" autoFocus />
        </Field>
        <Field label="หมวดหมู่">
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="จำนวนคงเหลือ">
            <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="เช่น 10" inputMode="numeric" />
          </Field>
          <Field label="หน่วย">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="เช่น L, kg, กล่อง" />
          </Field>
          <Field label="จุดสั่งซื้อขั้นต่ำ">
            <Input value={min} onChange={(e) => setMin(e.target.value)} placeholder="เช่น 5" inputMode="numeric" />
          </Field>
          <Field label="สต็อกสูงสุด">
            <Input value={max} onChange={(e) => setMax(e.target.value)} placeholder="เช่น 20" inputMode="numeric" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
