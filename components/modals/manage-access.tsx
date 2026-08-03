"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

const ROLES = ["ผู้ดูแลระบบ", "QA", "นักวิทยาศาสตร์", "ทั่วไป"];
const PERMS = ["ดู", "แก้ไข", "ลบ", "อนุมัติ"];

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  ผู้ดูแลระบบ: { ดู: true, แก้ไข: true, ลบ: true, อนุมัติ: true },
  QA: { ดู: true, แก้ไข: true, ลบ: false, อนุมัติ: true },
  นักวิทยาศาสตร์: { ดู: true, แก้ไข: true, ลบ: false, อนุมัติ: false },
  ทั่วไป: { ดู: true, แก้ไข: false, ลบ: false, อนุมัติ: false },
};

export function ManageAccessModal() {
  const { activeModal, closeModal, pushToast } = useLims();
  const open = activeModal === "manage-access";
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);

  const toggle = (role: string, perm: string) => {
    setMatrix((prev) => ({ ...prev, [role]: { ...prev[role], [perm]: !prev[role][perm] } }));
  };

  const handleClose = () => closeModal();
  const handleSave = () => {
    pushToast("บันทึกการเปลี่ยนแปลงสิทธิ์เข้าถึงเรียบร้อย");
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="จัดการสิทธิ์เข้าถึง"
      icon={<Icons.Lock />}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSave}>
            <Icons.Check className="h-[14px] w-[14px]" />
            บันทึกการเปลี่ยนแปลง
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-line px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                บทบาท
              </th>
              {PERMS.map((p) => (
                <th key={p} className="border-b border-line px-3 py-2 text-center text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((role) => (
              <tr key={role}>
                <td className="border-b border-line px-3 py-2.5 font-medium">{role}</td>
                {PERMS.map((perm) => (
                  <td key={perm} className="border-b border-line px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={matrix[role][perm]}
                      onChange={() => toggle(role, perm)}
                      className="h-4 w-4 accent-teal"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
