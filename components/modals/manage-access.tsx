"use client";

import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

export function ManageAccessModal() {
  const { activeModal, closeModal } = useLims();
  const open = activeModal === "manage-access";

  const handleClose = () => closeModal();

  return (
    <Modal open={open} onClose={handleClose} title="จัดการสิทธิ์เข้าถึง" icon={<Icons.Lock />} size="sm">
      <div className="flex flex-col gap-4">
        {/* ADR-0002: การกำหนดสิทธิ์ตามบทบาทจัดการที่ backend — frontend ยังไม่มีหน้าจัดการ matrix */}
        <div className="rounded-lg border border-line bg-bg px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          การกำหนดสิทธิ์การเข้าถึงตามบทบาท (role) จัดการที่ระบบหลังบ้าน — หน้าจอปรับสิทธิ์ในแอปยังไม่เปิดใช้งาน
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          ปิด
        </Button>
      </div>
    </Modal>
  );
}
