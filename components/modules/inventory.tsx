"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import type { PurchaseOrder } from "@/lib/data";
import { Button, Card, CardHead, Donut, KpiCard, PageHead, Seg, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiFetch } from "@/lib/api-client";
import { mapPurchaseOrder, type PurchaseOrderDTO } from "@/lib/backend-mappers";

const SEG_OPTIONS = ["ทั้งหมด", "ต้องสั่งซื้อ"];

const DONUT_COLORS = [
  "var(--color-teal)",
  "var(--color-amber)",
  "var(--color-violet)",
  "var(--color-green)",
  "var(--color-red)",
  "var(--color-muted-2)",
];

function stockColor(pct: number) {
  if (pct < 20) return "var(--color-red)";
  if (pct < 35) return "var(--color-amber)";
  return "var(--color-green)";
}

function usePurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  useEffect(() => {
    apiFetch<PurchaseOrderDTO[]>("/purchase-orders")
      .then((r) => setOrders(r.map(mapPurchaseOrder)))
      .catch(() => {});
  }, []);
  return orders;
}

export function InventoryView() {
  const { inventory, openModal } = useLims();
  const [seg, setSeg] = useState(0);
  const purchaseOrders = usePurchaseOrders();

  const filtered = inventory.filter((i) => (seg === 1 ? i.status.tone === "red" || i.status.tone === "amber" : true));

  const autoOrders = purchaseOrders.filter(
    (o) => o.status.label === "รออนุมัติ" || o.status.label === "ส่งให้ผู้ขายแล้ว"
  );

  const catCounts = new Map<string, number>();
  for (const i of inventory) catCounts.set(i.cat, (catCounts.get(i.cat) ?? 0) + 1);
  const donutItems = Array.from(catCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], idx) => ({
      label,
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
      value: inventory.length > 0 ? Math.round((count / inventory.length) * 100) : 0,
    }));

  return (
    <div className="animate-fade">
      <PageHead
        title="การจัดการสินค้าคงคลัง"
        desc="บริหารสต็อกวัสดุ สารเคมี และอุปกรณ์ในห้องปฏิบัติการ พร้อมแจ้งเตือนและสั่งซื้อซ้ำอัตโนมัติเมื่อสินค้าใกล้หมด"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openModal("order-history")}>
              <Icons.Cart className="h-[15px] w-[15px]" />
              ประวัติสั่งซื้อ
            </Button>
            <Button variant="teal" onClick={() => openModal("add-inventory")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              เพิ่มรายการ
            </Button>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="teal" label="รายการทั้งหมด" value="418" trend="ใน 7 หมวดหมู่" />
        <KpiCard accent="red" label="ถึงจุดสั่งซื้อ" value="2" trend="สั่งซื้ออัตโนมัติแล้ว" trendDown />
        <KpiCard accent="amber" label="ใกล้หมด" value="5" trend="ต่ำกว่า 30%" trendDown />
        <KpiCard accent="green" label="มูลค่าคงคลัง" value="฿1.24" unit="M" trend="อัปเดตล่าสุด" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHead
            icon={<Icons.Inventory />}
            title="ระดับสต็อกปัจจุบัน"
            right={<Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["รหัส", "รายการ", "หมวด", "ระดับสต็อก (เส้น = จุดสั่งซื้อ)", "คงเหลือ", "สถานะ"].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const minPos = (i.min / i.max) * 100;
                  return (
                    <tr key={i.id} className="transition hover:bg-bg/60">
                      <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium">{i.id}</td>
                      <td className="border-b border-line px-3.5 py-3 font-medium">{i.name}</td>
                      <td className="border-b border-line px-3.5 py-3 text-[11.5px] text-muted">{i.cat}</td>
                      <td className="border-b border-line px-3.5 py-3">
                        <div className="relative h-[7px] min-w-[90px] overflow-hidden rounded-[4px] bg-bg-2">
                          <div className="h-full rounded-[4px]" style={{ width: `${i.pct}%`, background: stockColor(i.pct) }} />
                          <div className="absolute -top-[3px] -bottom-[3px] w-0.5 bg-ink opacity-35" style={{ left: `${minPos}%` }} />
                        </div>
                      </td>
                      <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">
                        {i.qty} {i.unit}
                      </td>
                      <td className="border-b border-line px-3.5 py-3">
                        <Tag {...i.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead
            icon={<Icons.Cart />}
            title="คำสั่งซื้ออัตโนมัติ"
            right={<Tag tone="teal" label="เปิดใช้งาน" />}
          />
          <div className="py-1.5">
            {autoOrders.length === 0 && (
              <div className="py-4 text-center text-[12.5px] text-muted">ไม่มีคำสั่งซื้อที่กำลังดำเนินการ</div>
            )}
            {autoOrders.map((o) => {
              const item = inventory.find((i) => i.id === o.item);
              return (
                <div key={o.id} className="flex items-start gap-3 border-b border-line px-4 py-[13px]">
                  <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] bg-teal-bg text-teal-d">
                    <Icons.Cart className="h-[17px] w-[17px]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{item?.name ?? o.item}</div>
                    <div className="mt-0.5 font-mono text-[11.5px] text-muted">
                      {o.id} · สั่งซื้อ {o.qty} {item?.unit ?? ""}
                    </div>
                  </div>
                  <Tag {...o.status} />
                </div>
              );
            })}
          </div>
          <div className="border-t border-line px-[18px] py-3.5">
            <h3 className="pb-3 font-display text-[13px] font-semibold">สัดส่วนตามหมวดหมู่</h3>
            <Donut items={donutItems} />
          </div>
        </Card>
      </div>
    </div>
  );
}
