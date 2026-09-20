"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Select } from "@/components/ui";
import { useUiStore } from "@/lib/stores/ui-store";

const REPORT_TYPES = ["รายงานสรุปรายวัน", "รายงานผลผิดปกติ", "รายงาน QC"];

export function GenerateReportModal() {
  const activeModal = useUiStore((s) => s.activeModal);
  const closeModal = useUiStore((s) => s.closeModal);
  const open = activeModal === "generate-report";
  const [type, setType] = useState(REPORT_TYPES[0]);

  const handleClose = () => {
    setType(REPORT_TYPES[0]);
    closeModal();
  };

  return (
    <Modal open={open} onClose={handleClose} title="สร้างรายงาน" icon={<Icons.Doc />} size="sm">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">ประเภทรายงาน</span>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </label>
        {/* การสร้างรายงานจริงยังไม่มี endpoint บน backend — ดู docs/backend-requests.md */}
        <div className="rounded-lg border border-line bg-bg px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          ฟังก์ชันสร้างและดาวน์โหลดรายงานอยู่ระหว่างการพัฒนา ยังไม่เปิดใช้งาน
        </div>
        <Button variant="teal" size="sm" disabled>
          <Icons.Bolt className="h-3.5 w-3.5" />
          สร้างรายงาน (เร็ว ๆ นี้)
        </Button>
      </div>
    </Modal>
  );
}
