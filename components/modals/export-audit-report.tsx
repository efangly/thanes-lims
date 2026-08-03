"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

type Stage = "collecting" | "generating" | "ready";

export function ExportAuditReportModal() {
  const { activeModal, closeModal, pushToast } = useLims();
  const open = activeModal === "export-audit-report";
  const [stage, setStage] = useState<Stage>("collecting");
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!open) {
      setStage("collecting");
      setPct(0);
      return;
    }
    const t1 = setTimeout(() => setStage("generating"), 900);
    const interval = setInterval(() => {
      setPct((p) => Math.min(100, p + 12));
    }, 150);
    const t2 = setTimeout(() => {
      setStage("ready");
      clearInterval(interval);
      setPct(100);
    }, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [open]);

  const handleClose = () => closeModal();

  return (
    <Modal open={open} onClose={handleClose} title="ส่งออกรายงาน Audit" icon={<Icons.Doc />} size="sm">
      {stage !== "ready" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-2">
            <div className="h-full rounded-full bg-teal transition-[width] duration-150" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-2 font-mono text-[12.5px] text-muted">
            <span className="h-2 w-2 rounded-full bg-teal animate-pulse-dot" />
            {stage === "collecting" ? "กำลังรวบรวมข้อมูล…" : "กำลังสร้างรายงาน PDF…"}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-teal-d">
            <Icons.Check className="h-4 w-4" />
            รายงานพร้อมแล้ว
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-bg p-3.5">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-violet-bg text-violet">
              <Icons.Doc className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium">Audit-Report-2569-07-21.pdf</div>
              <div className="text-[11.5px] text-muted">2.4 MB · 32 เครื่องมือ</div>
            </div>
          </div>
          <Button
            variant="teal"
            size="sm"
            onClick={() => {
              pushToast("ดาวน์โหลดรายงาน Audit แล้ว");
              handleClose();
            }}
          >
            <Icons.Doc className="h-[14px] w-[14px]" />
            ดาวน์โหลด
          </Button>
        </div>
      )}
    </Modal>
  );
}
