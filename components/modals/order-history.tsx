"use client";

import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { PURCHASE_ORDERS } from "@/lib/data";

export function OrderHistoryModal() {
  const { activeModal, closeModal } = useLims();
  const open = activeModal === "order-history";

  return (
    <Modal open={open} onClose={closeModal} title="ประวัติสั่งซื้อ" icon={<Icons.Cart />} size="lg">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["เลขที่ใบสั่งซื้อ", "รายการ", "จำนวน", "ผู้ขาย", "วันที่", "สถานะ"].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PURCHASE_ORDERS.map((o) => (
              <tr key={o.id} className="transition hover:bg-bg/60">
                <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium">{o.id}</td>
                <td className="border-b border-line px-3.5 py-3 font-medium">{o.item}</td>
                <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">{o.qty}</td>
                <td className="border-b border-line px-3.5 py-3 text-[12.5px] text-muted">{o.vendor}</td>
                <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">{o.date}</td>
                <td className="border-b border-line px-3.5 py-3">
                  <Tag {...o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
