"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import { Button, Select } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

const REPORT_TYPES = ["รายงานสรุปรายวัน", "รายงานผลผิดปกติ", "รายงาน QC"];

type Stage = "select" | "processing" | "ready";

export function GenerateReportModal() {
  const { activeModal, closeModal, pushToast } = useLims();
  const open = activeModal === "generate-report";
  const [stage, setStage] = useState<Stage>("select");
  const [type, setType] = useState(REPORT_TYPES[0]);

  const handleClose = () => {
    setStage("select");
    setType(REPORT_TYPES[0]);
    closeModal();
  };

  const handleGenerate = () => {
    setStage("processing");
    setTimeout(() => setStage("ready"), 1600);
  };

  return (
    <Modal open={open} onClose={handleClose} title="สร้างรายงาน" icon={<Icons.Doc />} size="sm">
      {stage === "select" && (
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
          <Button variant="teal" size="sm" onClick={handleGenerate}>
            <Icons.Bolt className="h-[14px] w-[14px]" />
            สร้างรายงาน
          </Button>
        </div>
      )}

      {stage === "processing" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg-2">
            <div className="absolute inset-y-0 w-1/3 rounded-full bg-teal animate-progress-indet" />
          </div>
          <div className="flex items-center gap-2 font-mono text-[12.5px] text-muted">
            <span className="h-2 w-2 rounded-full bg-teal animate-pulse-dot" />
            กำลังประมวลผล {type}…
          </div>
        </div>
      )}

      {stage === "ready" && (
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
              <div className="text-[13px] font-medium">{type}.pdf</div>
              <div className="text-[11.5px] text-muted">1.1 MB</div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => {
                pushToast("ส่งอีเมลรายงานแล้ว");
                handleClose();
              }}
            >
              ส่งอีเมล
            </Button>
            <Button
              variant="teal"
              size="sm"
              className="flex-1"
              onClick={() => {
                pushToast("ดาวน์โหลดรายงานแล้ว");
                handleClose();
              }}
            >
              ดาวน์โหลด
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
