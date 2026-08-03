"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { DOC_HISTORY } from "@/lib/data";
import { Button, Card, CardHead, KpiCard, PageHead, Seg, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

const SEG_OPTIONS = ["ทั้งหมด", "SOP", "นโยบาย", "แบบฟอร์ม"];
const SEG_TYPE = ["", "SOP", "Policy", "Form"];

export function DocumentsView() {
  const { documents, openModal } = useLims();
  const [seg, setSeg] = useState(0);

  const filtered = documents.filter((d) => (seg === 0 ? true : d.type === SEG_TYPE[seg]));

  return (
    <div className="animate-fade">
      <PageHead
        title="การจัดการเอกสาร"
        desc="จัดระเบียบ SOP คู่มือ นโยบาย และแบบฟอร์ม พร้อมติดตามประวัติการแก้ไข ป้องกันเอกสารสูญหาย และจำกัดสิทธิ์เข้าถึงข้อมูลลับตามบทบาท"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openModal("manage-access")}>
              <Icons.Lock className="h-[15px] w-[15px]" />
              จัดการสิทธิ์เข้าถึง
            </Button>
            <Button variant="teal" onClick={() => openModal("upload-document")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              อัปโหลดเอกสาร
            </Button>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="violet" label="เอกสารทั้งหมด" value="142" trend="ควบคุมเวอร์ชัน" />
        <KpiCard accent="teal" label="SOP ที่ใช้งาน" value="38" trend="ทบทวนครบตามรอบ" />
        <KpiCard accent="amber" label="รอทบทวน/อนุมัติ" value="4" trend="ภายในเดือนนี้" trendDown />
        <KpiCard accent="red" label="เอกสารจำกัดสิทธิ์" value="11" trend="เข้าถึงตามบทบาท" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHead
            icon={<Icons.Doc />}
            title="คลังเอกสาร"
            right={<Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />}
          />
          <div>
            {filtered.map((d, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line px-[18px] py-3 transition last:border-none hover:bg-bg/60">
                <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-violet-bg text-violet">
                  <Icons.Doc className="h-[17px] w-[17px]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    {d.name}
                    {d.locked && <Icons.Lock className="h-3 w-3 text-muted-2" />}
                  </div>
                  <div className="text-[11.5px] text-muted">
                    {d.type} · แก้ไขล่าสุดโดย {d.by} · {d.date}
                  </div>
                </div>
                <Tag tone={d.locked ? "red" : "green"} label={d.access} />
                <span className="rounded-[5px] border border-line bg-bg px-[7px] py-0.5 font-mono text-[11px] text-muted">
                  {d.ver}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead
            icon={<Icons.Clock />}
            title="ประวัติการแก้ไข"
            right={<span className="font-mono text-[11.5px] text-muted">SOP-เก็บตัวอย่างเลือด</span>}
          />
          <div className="px-5 pb-3.5 pt-1.5">
            {DOC_HISTORY.map((v, i) => {
              const isFirst = i === 0;
              const isLast = i === DOC_HISTORY.length - 1;
              return (
                <div key={i} className="relative flex gap-3.5 py-3">
                  {!isLast && <span className="absolute left-[15px] top-[34px] -bottom-3 w-0.5 bg-line" />}
                  <div
                    className={`z-10 grid h-8 w-8 flex-none place-items-center rounded-full border-2 ${
                      isFirst ? "border-teal bg-teal text-white" : "border-line-2 bg-bg text-muted"
                    }`}
                  >
                    {isFirst ? <Icons.Check className="h-[15px] w-[15px]" /> : <Icons.Doc className="h-[15px] w-[15px]" />}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium">
                      {v.ver} — {v.change}
                    </div>
                    <div className="mt-0.5 font-mono text-[11.5px] text-muted">{v.date}</div>
                    <div className="mt-[3px] flex items-center gap-1.5 text-[12px] text-muted">
                      <Icons.User className="h-3 w-3 opacity-60" />
                      {v.who}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 px-5 pb-4 text-[11.5px] text-muted-2">
            <Icons.Shield className="h-[13px] w-[13px]" />
            ทุกเวอร์ชันถูกจัดเก็บ ย้อนคืนได้ ป้องกันการสูญหาย
          </div>
        </Card>
      </div>
    </div>
  );
}
