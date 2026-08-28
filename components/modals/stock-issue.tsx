"use client";

import { useEffect, useMemo, useState } from "react";
import type { InventoryItem, InventoryLot } from "@/lib/data";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Input, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useConfirm } from "@/lib/confirm-context";
import { apiErrorMessage } from "@/lib/api-client";
import { listLots } from "@/lib/inventory-api";
import type { IssueShortfall } from "@/lib/inventory-api";

const TH = "whitespace-nowrap border-b border-line bg-bg px-3 py-[9px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted";
const TD = "border-b border-line px-3 py-2.5";

export function StockIssueModal({
  item,
  open,
  onClose,
}: {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const { issueStock, pushToast } = useLims();
  const confirm = useConfirm();

  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [qtyByLot, setQtyByLot] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"input" | "shortfall">("input");
  const [shortfalls, setShortfalls] = useState<IssueShortfall[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    setLoading(true);
    listLots(item.id)
      .then((r) => {
        if (!cancelled) setLots(r);
      })
      .catch((err) => {
        if (!cancelled) {
          setLots([]);
          pushToast(apiErrorMessage(err), "red");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item, pushToast]);

  const handleClose = () => {
    setLots([]);
    setQtyByLot({});
    setPhase("input");
    setShortfalls([]);
    setSubmitting(false);
    onClose();
  };

  const lines = useMemo(
    () =>
      lots
        .map((l) => ({ lot_id: l.id, quantity: Math.floor(Number(qtyByLot[l.id])) }))
        .filter((l) => Number.isFinite(l.quantity) && l.quantity > 0),
    [lots, qtyByLot]
  );

  const handleIssue = async (force: boolean) => {
    if (!item || lines.length === 0) return;
    setSubmitting(true);
    try {
      const res = await issueStock(item.id, lines, force);
      if (res.applied) {
        pushToast(`เบิกออกเรียบร้อย — ยอดคงเหลือใหม่ ${res.item.quantity} ${item.unit}`);
        if (res.lots.some((l) => l.quantity < 0)) {
          pushToast("มี lot ที่ยอดติดลบ กรุณาตรวจนับสต็อกจริง", "amber");
        }
        handleClose();
      } else {
        setShortfalls(res.shortfalls);
        setPhase("shortfall");
      }
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForce = async () => {
    const ok = await confirm({
      variant: "danger",
      title: "ยืนยันเบิกเกินยอดคงเหลือ",
      message:
        "lot ที่ขอเกินจะมียอดติดลบ เป็นสัญญาณว่ายอดจริงกับระบบไม่ตรง ต้องไปตรวจนับสต็อก ยืนยันที่จะเบิกต่อหรือไม่?",
      confirmText: "ยืนยันเบิกเกิน",
    });
    if (ok) await handleIssue(true);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เบิกของออกจากคลัง"
      icon={<Icons.Arrow />}
      size="lg"
      footer={
        phase === "input" ? (
          <>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button
              variant="teal"
              size="sm"
              onClick={() => handleIssue(false)}
              disabled={submitting || loading || lines.length === 0}
            >
              <Icons.Arrow className="h-[14px] w-[14px]" />
              {submitting ? "กำลังเบิก..." : "เบิก"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setPhase("input")}>
              แก้จำนวน
            </Button>
            <Button variant="danger" size="sm" onClick={handleForce} disabled={submitting}>
              {submitting ? "กำลังเบิก..." : "ยืนยันเบิกเกิน (lot จะติดลบ)"}
            </Button>
          </>
        )
      }
    >
      {item && (
        <div className="mb-3.5 flex items-center justify-between rounded-lg border border-line bg-bg px-3.5 py-2.5">
          <div>
            <div className="font-mono text-[12.5px] font-medium text-ink">{item.id}</div>
            <div className="text-[13px]">{item.name}</div>
          </div>
          <div className="text-right text-[12.5px] text-muted">
            คงเหลือรวม
            <div className="font-mono text-[13px] text-ink">
              {item.qty} {item.unit}
            </div>
          </div>
        </div>
      )}

      {phase === "input" ? (
        loading ? (
          <div className="py-6 text-center text-[12.5px] text-muted">กำลังโหลดรายการ lot…</div>
        ) : lots.length === 0 ? (
          <div className="py-6 text-center text-[12.5px] text-muted">ไม่มี lot สำหรับรายการนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Lot", "วันหมดอายุ", "คงเหลือ", "จำนวนที่เบิก"].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => (
                  <tr key={l.id}>
                    <td className={`${TD} font-mono text-[12.5px] font-medium`}>{l.lotNo}</td>
                    <td className={`${TD} text-[12px] text-muted`}>{l.expireLabel}</td>
                    <td className={`${TD} font-mono text-[12.5px]`}>
                      <span className="inline-flex items-center gap-1.5">
                        {l.qty}
                        {l.qty < 0 && <Tag tone="red" label="ติดลบ" />}
                      </span>
                    </td>
                    <td className={TD}>
                      <Input
                        value={qtyByLot[l.id] ?? ""}
                        onChange={(e) => setQtyByLot((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        placeholder="0"
                        inputMode="numeric"
                        className="max-w-[110px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-ink">จำนวนที่ขอเบิกเกินยอดคงเหลือของ lot ต่อไปนี้ — ยังไม่มีการหักสต็อกใด ๆ</p>
          <div className="rounded-lg border border-line">
            {shortfalls.map((s) => (
              <div
                key={s.lot_id}
                className="flex items-center justify-between border-b border-line px-3.5 py-2.5 text-[12.5px] last:border-b-0"
              >
                <span className="font-mono font-medium">{s.lot_no}</span>
                <span className="text-muted">
                  คงเหลือ <span className="font-mono text-ink">{s.available}</span> · ขอเบิก{" "}
                  <span className="font-mono text-red">{s.requested}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-muted-2">
            เลือก &ldquo;แก้จำนวน&rdquo; เพื่อปรับจำนวนหรือเพิ่ม lot อื่น หรือ &ldquo;ยืนยันเบิกเกิน&rdquo; เพื่อหักตามที่ขอ (lot จะติดลบ)
          </p>
        </div>
      )}
    </Modal>
  );
}
