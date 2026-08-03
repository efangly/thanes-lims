"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Input } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { GAUGES } from "@/lib/data";

function parseRange(range: string) {
  const m = range.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
  return m ? { low: m[1], high: m[2] } : { low: "", high: "" };
}

export function AlertThresholdsModal() {
  const { activeModal, closeModal, pushToast } = useLims();
  const open = activeModal === "alert-thresholds";
  const [values, setValues] = useState(() => GAUGES.map((g) => parseRange(g.range)));

  const handleClose = () => closeModal();
  const handleSave = () => {
    pushToast("บันทึกเกณฑ์แจ้งเตือนเรียบร้อย");
    handleClose();
  };

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
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSave}>
            <Icons.Check className="h-[14px] w-[14px]" />
            บันทึก
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {GAUGES.map((g, i) => (
          <div key={g.loc} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-3">
            <div className="flex-1">
              <div className="text-[13px] font-medium">{g.loc}</div>
              <div className="text-[11px] text-muted">หน่วย: {g.unit}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                value={values[i].low}
                onChange={(e) =>
                  setValues((prev) => prev.map((v, idx) => (idx === i ? { ...v, low: e.target.value } : v)))
                }
                className="w-[70px] text-center"
              />
              <span className="text-muted">–</span>
              <Input
                value={values[i].high}
                onChange={(e) =>
                  setValues((prev) => prev.map((v, idx) => (idx === i ? { ...v, high: e.target.value } : v)))
                }
                className="w-[70px] text-center"
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
