"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Input } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiFetch } from "@/lib/api-client";
import { mapGauge, type GaugeDTO } from "@/lib/backend-mappers";
import type { Gauge } from "@/lib/data";

interface Row {
  low: string;
  high: string;
}

export function AlertThresholdsModal() {
  const { activeModal, closeModal } = useLims();
  const open = activeModal === "alert-thresholds";

  const [gauges, setGauges] = useState<Gauge[] | null>(null);
  const [error, setError] = useState(false);
  const [values, setValues] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setGauges(null);
    setError(false);
    apiFetch<GaugeDTO[]>("/environment/gauges")
      .then((r) => {
        if (cancelled) return;
        const mapped = r.map(mapGauge);
        setGauges(mapped);
        setValues(mapped.map((g) => ({ low: String(g.rangeMin), high: String(g.rangeMax) })));
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => closeModal();

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="ตั้งค่าเกณฑ์แจ้งเตือน"
      icon={<Icons.Bell />}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ปิด
          </Button>
          {/* การบันทึกเกณฑ์ยังไม่มี endpoint บน backend — ดู docs/backend-requests.md */}
          <Button variant="teal" size="sm" disabled>
            <Icons.Check className="h-[14px] w-[14px]" />
            บันทึก (เร็ว ๆ นี้)
          </Button>
        </>
      }
    >
      {gauges === null && !error && (
        <div className="py-8 text-center text-[12.5px] text-muted">กำลังโหลด…</div>
      )}
      {error && <div className="py-8 text-center text-[12.5px] text-red">โหลดข้อมูลเซนเซอร์ไม่สำเร็จ</div>}
      {gauges?.length === 0 && (
        <div className="py-8 text-center text-[12.5px] text-muted">ยังไม่มีเซนเซอร์ในระบบ</div>
      )}
      {gauges && gauges.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11.5px] text-muted">
            แสดงเกณฑ์ปัจจุบันจากระบบ — การแก้ไขและบันทึกจะเปิดใช้งานเมื่อ backend รองรับ
          </p>
          {gauges.map((g, i) => (
            <div key={g.loc} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-3">
              <div className="flex-1">
                <div className="text-[13px] font-medium">{g.loc}</div>
                <div className="text-[11px] text-muted">หน่วย: {g.unit}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={values[i]?.low ?? ""}
                  onChange={(e) =>
                    setValues((prev) => prev.map((v, idx) => (idx === i ? { ...v, low: e.target.value } : v)))
                  }
                  disabled
                  className="w-[70px] text-center"
                />
                <span className="text-muted">–</span>
                <Input
                  value={values[i]?.high ?? ""}
                  onChange={(e) =>
                    setValues((prev) => prev.map((v, idx) => (idx === i ? { ...v, high: e.target.value } : v)))
                  }
                  disabled
                  className="w-[70px] text-center"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
