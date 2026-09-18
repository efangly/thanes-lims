"use client";

import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

export function ExportAuditReportModal() {
  const { activeModal, closeModal } = useLims();
  const open = activeModal === "export-audit-report";

  const handleClose = () => closeModal();

  return (
    <Modal open={open} onClose={handleClose} title="ส่งออกรายงาน Audit" icon={<Icons.Doc />} size="sm">
      <div className="flex flex-col gap-4">
        {/* การสร้างรายงาน Audit จริงยังไม่มี endpoint บน backend — ดู docs/backend-requests.md */}
        <div className="rounded-lg border border-line bg-bg px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          ฟังก์ชันรวบรวมและส่งออกรายงาน Audit เป็น PDF อยู่ระหว่างการพัฒนา ยังไม่เปิดใช้งาน
        </div>
        <Button variant="teal" size="sm" disabled>
          <Icons.Doc className="h-3.5 w-3.5" />
          ส่งออก PDF (เร็ว ๆ นี้)
        </Button>
      </div>
    </Modal>
  );
}
