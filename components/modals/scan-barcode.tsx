"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Avatar, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

export function ScanBarcodeModal() {
  const { activeModal, closeModal, samples, pushToast } = useLims();
  const open = activeModal === "scan-barcode";
  const [phase, setPhase] = useState<"scanning" | "found">("scanning");
  const [foundIdx, setFoundIdx] = useState(0);

  useEffect(() => {
    if (!open) {
      setPhase("scanning");
      return;
    }
    const t = setTimeout(() => {
      setFoundIdx(Math.floor(Math.random() * samples.length));
      setPhase("found");
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    setPhase("scanning");
    closeModal();
  };

  const s = samples[foundIdx];

  return (
    <Modal open={open} onClose={handleClose} title="สแกนบาร์โค้ด" icon={<Icons.Arrow />} size="sm">
      {phase === "scanning" ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative h-[140px] w-full overflow-hidden rounded-lg border-2 border-dashed border-line bg-bg">
            <div className="absolute left-0 right-0 h-[2px] bg-teal shadow-[0_0_8px_2px_var(--color-teal)] animate-scan-line" />
            <div className="grid h-full place-items-center">
              <Icons.Sample className="h-10 w-10 text-muted-2 opacity-40" />
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[12.5px] text-muted">
            <span className="h-2 w-2 rounded-full bg-teal animate-pulse-dot" />
            กำลังสแกน…
          </div>
        </div>
      ) : (
        s && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-teal-d">
              <Icons.Check className="h-4 w-4" />
              พบตัวอย่างในระบบ
            </div>
            <div className="rounded-lg border border-line bg-bg p-3.5">
              <div className="font-mono text-[13px] font-semibold text-ink">{s.id}</div>
              <div className="mt-1 text-[13px] font-medium">{s.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12.5px] text-muted">
                  <Avatar initials={s.custodian[0]} size="xs" />
                  {s.custodian}
                </span>
                <Tag {...s.status} />
              </div>
              <div className="mt-2 font-mono text-[11.5px] text-muted">{s.loc}</div>
            </div>
            <Button
              variant="teal"
              size="sm"
              onClick={() => {
                pushToast(`พบตัวอย่าง ${s.id}`);
                handleClose();
              }}
            >
              ดูรายละเอียด
            </Button>
          </div>
        )
      )}
    </Modal>
  );
}
