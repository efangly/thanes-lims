"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { InventoryItem, InventoryLot } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Button, Card, CardHead, Field, Input, PageHead } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";
import { listLots, receiveStock } from "@/lib/inventory-api";

interface ReceivedRow {
  key: string;
  itemName: string;
  lotNo: string;
  qty: number;
  unit: string;
  toppedUp: boolean;
}

/**
 * Receive goods into the store (requirement 3.2). One item, one lot per submit —
 * never a multi-line basket: the API is 1 lot per request, so looping would leave
 * the operator unsure what got in when line 3 of 5 fails. After each success the
 * form clears for the next item and the row is listed below.
 */
export function InventoryReceiveView() {
  const params = useSearchParams();
  const { inventory, applyReceivedItem, pushToast } = useLims();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState("");
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [lotNo, setLotNo] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [qty, setQty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [received, setReceived] = useState<ReceivedRow[]>([]);

  const preItem = params.get("item");
  useEffect(() => {
    if (preItem && !item) {
      const found = inventory.find((i) => i.id === preItem);
      if (found) setItem(found);
    }
  }, [preItem, inventory, item]);

  useEffect(() => {
    if (!item) {
      setLots([]);
      return;
    }
    listLots(item.id)
      .then(setLots)
      .catch(() => setLots([]));
  }, [item, received.length]);

  const matches = useMemo(() => {
    const n = search.trim().toLowerCase();
    const base = n
      ? inventory.filter((i) => i.name.toLowerCase().includes(n) || i.id.toLowerCase().includes(n))
      : inventory;
    return base.slice(0, 8);
  }, [search, inventory]);

  const dupLot = lotNo.trim() ? lots.find((l) => l.lotNo.toLowerCase() === lotNo.trim().toLowerCase()) : undefined;
  const canSubmit = item && lotNo.trim() && Number(qty) > 0;

  const submit = async () => {
    if (!item || !canSubmit) return;
    setSubmitting(true);
    try {
      const res = await receiveStock(item.id, {
        lotNo: lotNo.trim(),
        expireDate: expireDate || null,
        quantity: Number(qty),
      });
      applyReceivedItem(res.item);
      setReceived((prev) => [
        {
          key: `${Date.now()}`,
          itemName: item.name,
          lotNo: res.lot.lotNo,
          qty: Number(qty),
          unit: item.unit,
          toppedUp: Boolean(dupLot),
        },
        ...prev,
      ]);
      pushToast(`รับเข้า ${qty} ${item.unit} — lot ${res.lot.lotNo}`);
      setLotNo("");
      setExpireDate("");
      setQty("");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade">
      <PageHead
        title="รับของเข้าคลัง"
        desc="รับสินค้าเข้าสต็อกทีละรายการ ทีละล็อต"
        actions={
          <Link href="/inventory" className="text-[12.5px] text-muted hover:text-ink">
            ← สินค้าคงคลัง
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHead icon={<Icons.Inventory />} title="รายการที่รับ" />
          <div className="flex flex-col gap-3.5 px-5 py-4">
            {!item ? (
              <Field label="ค้นหา / สแกนรายการ (ชื่อ หรือ รหัส)">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="พิมพ์เพื่อค้นหา" autoFocus />
                <div className="mt-1.5 max-h-[220px] overflow-y-auto rounded-lg border border-line">
                  {matches.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => setItem(i)}
                      className="flex w-full items-center justify-between border-b border-line px-3 py-2 text-left text-[13px] last:border-none hover:bg-bg"
                    >
                      <span>{i.name}</span>
                      <span className="font-mono text-[11px] text-muted">{i.id}</span>
                    </button>
                  ))}
                  {matches.length === 0 && <div className="px-3 py-3 text-[12.5px] text-muted">ไม่พบรายการ</div>}
                </div>
              </Field>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-line bg-bg px-3.5 py-2.5">
                <div>
                  <div className="text-[13px] font-medium">{item.name}</div>
                  <div className="font-mono text-[11.5px] text-muted">
                    {item.id} · คงเหลือ {item.qty} {item.unit}
                  </div>
                </div>
                <button onClick={() => setItem(null)} className="text-[12px] text-muted hover:underline">
                  เปลี่ยน
                </button>
              </div>
            )}

            {item && (
              <>
                <Field label="Lot No. (บังคับ)">
                  <Input value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="เช่น L2569-08" />
                </Field>
                {dupLot && (
                  <div className="rounded-lg border border-amber bg-amber-bg px-3 py-2 text-[11.5px] text-amber">
                    มี lot &quot;{dupLot.lotNo}&quot; อยู่แล้ว ({dupLot.qty} {item.unit}) — จำนวนที่รับจะ
                    <b> บวกทบ</b> เข้า lot เดิม
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันหมดอายุ (ไม่บังคับ)">
                    <Input type="date" value={expireDate} onChange={(e) => setExpireDate(e.target.value)} />
                  </Field>
                  <Field label="จำนวน (QTY)">
                    <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" placeholder="> 0" />
                  </Field>
                </div>
                <Button variant="teal" size="sm" onClick={submit} disabled={submitting || !canSubmit}>
                  {submitting ? "กำลังบันทึก..." : "รับเข้าคลัง"}
                </Button>
              </>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {item && (
            <Card>
              <CardHead icon={<Icons.Doc />} title={`ล็อตที่มีอยู่ของ ${item.name}`} />
              <div>
                {lots.length === 0 && <div className="px-5 py-4 text-[12.5px] text-muted">ยังไม่มีล็อต</div>}
                {lots.map((l) => (
                  <div key={l.id} className="flex items-center justify-between border-b border-line px-5 py-2.5 text-[12.5px] last:border-none">
                    <span className="font-mono">{l.lotNo}</span>
                    <span className="text-muted">หมดอายุ {l.expireLabel}</span>
                    <span className="font-mono">
                      {l.qty} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {received.length > 0 && (
            <Card>
              <CardHead icon={<Icons.Check />} title="รับเข้าในรอบนี้" />
              <div>
                {received.map((r) => (
                  <div key={r.key} className="flex items-center justify-between border-b border-line px-5 py-2.5 text-[12.5px] last:border-none">
                    <span>{r.itemName}</span>
                    <span className="font-mono text-muted">{r.lotNo}</span>
                    <span className="font-mono">
                      +{r.qty} {r.unit}
                      {r.toppedUp && <span className="ml-1 text-amber">(ทบ)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
