"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Card, CardHead, Field, Input, PageHead } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { createVendor, listVendors, updateVendor, type Vendor, type VendorInput } from "@/lib/vendors-api";

/**
 * Vendor master data. Deliberately no delete — a vendor is referenced by FK from
 * equipment, inventory items and purchase orders, so removing one would strand the
 * history that points at it. Retiring a vendor that is no longer used is a separate
 * conversation (and a backend field) we have not had yet.
 */
export default function VendorsPage() {
  const { pushToast } = useLims();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVendors(await listVendors());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? vendors.filter((v) => `${v.name} ${v.contactName} ${v.contactPhone} ${v.contactEmail}`.toLowerCase().includes(q))
    : vendors;

  const handleSaved = (vendor: Vendor, mode: "created" | "updated") => {
    setVendors((prev) =>
      mode === "created" ? [...prev, vendor] : prev.map((v) => (v.id === vendor.id ? vendor : v))
    );
    setEditing(null);
    pushToast(mode === "created" ? "เพิ่มผู้ขายเรียบร้อย" : "แก้ไขผู้ขายเรียบร้อย");
  };

  return (
    <div className="animate-fade">
      <PageHead
        title="ผู้ขาย (Vendor)"
        desc="ข้อมูลหลักของผู้ขาย/ผู้ให้บริการ ใช้ร่วมกันทั้งเครื่องมือ สินค้าคงคลัง และใบสั่งซื้อ — แก้ที่นี่ที่เดียว ทุกที่ที่อ้างถึงเปลี่ยนตาม"
        actions={
          <Button variant="teal" onClick={() => setEditing("new")}>
            <Icons.Plus className="h-[15px] w-[15px]" />
            เพิ่มผู้ขาย
          </Button>
        }
      />

      <Card>
        <CardHead
          icon={<Icons.Cart />}
          title={`ผู้ขายทั้งหมด${vendors.length > 0 ? ` (${vendors.length})` : ""}`}
          right={
            // Input carries `w-full`; the width has to come from a wrapper, not a class on it.
            <div className="w-[260px]">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ / ผู้ติดต่อ / เบอร์โทร"
              />
            </div>
          }
        />

        {loading && <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
        {error && <div className="px-[18px] py-6 text-center text-[12.5px] text-red">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-[18px] py-6 text-center text-[12.5px] text-muted">
            {vendors.length === 0 ? "ยังไม่มีผู้ขายในระบบ — เพิ่มรายแรกด้านบน" : "ไม่พบผู้ขายที่ตรงกับคำค้นหา"}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["ผู้ขาย", "ผู้ติดต่อ", "โทรศัพท์", "อีเมล", "ที่อยู่", ""].map((h, i) => (
                    <th
                      key={i}
                      className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="transition hover:bg-bg/60">
                    <td className="border-b border-line px-3.5 py-3 font-medium">{v.name}</td>
                    <td className="border-b border-line px-3.5 py-3 text-muted">{v.contactName || "—"}</td>
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] text-muted">
                      {v.contactPhone || "—"}
                    </td>
                    <td className="border-b border-line px-3.5 py-3 text-muted">{v.contactEmail || "—"}</td>
                    <td className="max-w-[280px] truncate border-b border-line px-3.5 py-3 text-muted">
                      {v.address || "—"}
                    </td>
                    <td className="border-b border-line px-3.5 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(v)}>
                        แก้ไข
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <VendorFormModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        onError={(m) => pushToast(m, "red")}
      />
    </div>
  );
}

function VendorFormModal({
  target,
  onClose,
  onSaved,
  onError,
}: {
  /** `"new"` opens an empty create form; a Vendor opens it prefilled for editing. */
  target: Vendor | "new" | null;
  onClose: () => void;
  onSaved: (vendor: Vendor, mode: "created" | "updated") => void;
  onError: (message: string) => void;
}) {
  const editingVendor = target && target !== "new" ? target : null;
  const [form, setForm] = useState<VendorInput>({ name: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm(
      editingVendor
        ? {
            name: editingVendor.name,
            contactName: editingVendor.contactName,
            contactPhone: editingVendor.contactPhone,
            contactEmail: editingVendor.contactEmail,
            address: editingVendor.address,
          }
        : { name: "" }
    );
  }, [target, editingVendor]);

  const set = (patch: Partial<VendorInput>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleClose = useCallback(() => onClose(), [onClose]);

  const handleSubmit = async () => {
    if (!form.name?.trim()) return;
    setSubmitting(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      const saved = editingVendor ? await updateVendor(editingVendor.id, payload) : await createVendor(payload);
      onSaved(saved, editingVendor ? "updated" : "created");
    } catch (err) {
      onError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={handleClose}
      title={editingVendor ? "แก้ไขผู้ขาย" : "เพิ่มผู้ขาย"}
      icon={<Icons.Cart />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={submitting || !form.name?.trim()}>
            <Icons.Check className="h-[14px] w-[14px]" />
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อผู้ขาย">
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="เช่น บจก. เคมีภัณฑ์ไทย" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อผู้ติดต่อ">
            <Input value={form.contactName ?? ""} onChange={(e) => set({ contactName: e.target.value })} />
          </Field>
          <Field label="โทรศัพท์">
            <Input value={form.contactPhone ?? ""} onChange={(e) => set({ contactPhone: e.target.value })} inputMode="tel" />
          </Field>
        </div>
        <Field label="อีเมล">
          <Input value={form.contactEmail ?? ""} onChange={(e) => set({ contactEmail: e.target.value })} type="email" />
        </Field>
        <Field label="ที่อยู่">
          <Input value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
