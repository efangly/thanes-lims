"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useUiStore } from "@/lib/stores/ui-store";
import { listPurchaseOrders } from "@/lib/purchase-orders-api";
import type { PurchaseOrder } from "@/lib/data";

export function OrderHistoryModal() {
  const { inventory } = useLims();
  const activeModal = useUiStore((s) => s.activeModal);
  const closeModal = useUiStore((s) => s.closeModal);
  const open = activeModal === "order-history";

  const [orders, setOrders] = useState<PurchaseOrder[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOrders(null);
    setError(false);
    listPurchaseOrders()
      .then((r) => !cancelled && setOrders(r))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal open={open} onClose={closeModal} title="ประวัติสั่งซื้อ" icon={<Icons.Cart />} size="lg">
      {orders === null && !error && (
        <div className="py-8 text-center text-[12.5px] text-muted">กำลังโหลด…</div>
      )}
      {error && (
        <div className="py-8 text-center text-[12.5px] text-red">โหลดประวัติสั่งซื้อไม่สำเร็จ</div>
      )}
      {orders?.length === 0 && (
        <div className="py-8 text-center text-[12.5px] text-muted">ยังไม่มีใบสั่งซื้อในระบบ</div>
      )}
      {orders && orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["เลขที่ใบสั่งซื้อ", "รายการ", "จำนวน", "ผู้ขาย", "วันที่", "สถานะ"].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-2.75 text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const item = inventory.find((i) => i.id === o.item);
                return (
                  <tr key={o.id} className="transition hover:bg-bg/60">
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium">{o.id}</td>
                    <td className="border-b border-line px-3.5 py-3 font-medium">{item?.name ?? o.item}</td>
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">
                      {o.qty}
                      {item?.unit ? ` ${item.unit}` : ""}
                    </td>
                    <td className="border-b border-line px-3.5 py-3 text-[12.5px] text-muted">{o.vendor}</td>
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">{o.date}</td>
                    <td className="border-b border-line px-3.5 py-3">
                      <Tag {...o.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
