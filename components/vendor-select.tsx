"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api-client";
import { createVendor, listVendors, type Vendor } from "@/lib/vendors-api";

const ADD_NEW = "__add_new__";

/**
 * Picks a Vendor for an Equipment / Inventory / Purchase Order form.
 *
 * Creating one never means leaving the form: the last option opens a quick-add that
 * writes the real master record and selects it. What it creates is the shared Vendor,
 * not a per-form copy — "Vendor Contact Detail" on the requirement list is the read-only
 * summary below, not a second place to type contact details in.
 */
export function VendorSelect({
  value,
  onChange,
  label = "ผู้ขาย (Vendor)",
  disabled = false,
  onError,
}: {
  value: string | null;
  onChange: (vendorId: string | null) => void;
  label?: string;
  disabled?: boolean;
  /** Reported instead of swallowed so the host form can toast in its own style. */
  onError?: (message: string) => void;
}) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVendors(await listVendors());
    } catch (err) {
      onError?.(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // onError is a fresh closure on every host render; depending on it would refetch the list each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = vendors.find((v) => v.id === value) ?? null;

  const handleCreated = (vendor: Vendor) => {
    setVendors((prev) => [...prev, vendor].sort((a, b) => a.name.localeCompare(b.name, "th")));
    onChange(vendor.id);
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Field label={label}>
        <Select
          value={value ?? ""}
          disabled={disabled || loading}
          onChange={(e) => {
            if (e.target.value === ADD_NEW) {
              setAdding(true);
              return;
            }
            onChange(e.target.value || null);
          }}
        >
          <option value="">{loading ? "กำลังโหลด…" : "ไม่ระบุ"}</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value={ADD_NEW}>+ เพิ่มผู้ขายใหม่…</option>
        </Select>
      </Field>

      {selected && (
        <div className="rounded-lg border border-line bg-bg px-3 py-2 text-[12px] text-muted">
          <div className="font-medium text-ink">{selected.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {selected.contactName && <span>ผู้ติดต่อ: {selected.contactName}</span>}
            {selected.contactPhone && <span>โทร: {selected.contactPhone}</span>}
            {selected.contactEmail && <span>{selected.contactEmail}</span>}
          </div>
          {selected.address && <div className="mt-0.5">{selected.address}</div>}
          {!selected.contactName && !selected.contactPhone && !selected.contactEmail && !selected.address && (
            <div className="mt-0.5">ยังไม่มีข้อมูลติดต่อ — แก้ไขได้ที่หน้าผู้ขาย</div>
          )}
        </div>
      )}

      <QuickAddVendorModal open={adding} onClose={() => setAdding(false)} onCreated={handleCreated} onError={onError} />
    </div>
  );
}

function QuickAddVendorModal({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (vendor: Vendor) => void;
  onError?: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setName("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setAddress("");
    onClose();
  }, [onClose]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const vendor = await createVendor({
        name: name.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        address: address.trim(),
      });
      onCreated(vendor);
      handleClose();
    } catch (err) {
      onError?.(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มผู้ขายใหม่"
      icon={<Icons.Cart />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            <Icons.Plus className="h-[14px] w-[14px]" />
            {submitting ? "กำลังบันทึก..." : "บันทึกและเลือก"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อผู้ขาย">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น บจก. เคมีภัณฑ์ไทย" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อผู้ติดต่อ">
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label="โทรศัพท์">
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" />
          </Field>
        </div>
        <Field label="อีเมล">
          <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
        </Field>
        <Field label="ที่อยู่">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="rounded-lg border border-line bg-bg px-3 py-2.5 text-[12px] text-muted">
          ผู้ขายที่เพิ่มที่นี่จะถูกบันทึกเป็นข้อมูลหลักของระบบ ใช้ร่วมกับเครื่องมือ คลัง และใบสั่งซื้อทั้งหมด
        </div>
      </div>
    </Modal>
  );
}
