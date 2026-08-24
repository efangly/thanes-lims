"use client";

import { useState } from "react";
import { Icons } from "@/lib/icons";
import { Button, Card, CardHead, Donut, KpiCard, PageHead, Seg, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";

const flagColor = { hi: "text-red", lo: "text-amber", ok: "text-green" };
const SEG_OPTIONS = ["ทั้งหมด", "รอทวนสอบ", "ผิดปกติ"];

export default function TestsPage() {
  const { tests, openModal } = useLims();
  const [seg, setSeg] = useState(0);

  const filtered = tests.filter((t) => {
    if (seg === 1) return t.status.label === "รอทวนสอบ";
    if (seg === 2) return t.flag !== "ok";
    return true;
  });

  return (
    <div className="animate-fade">
      <PageHead
        title="การจัดการทดสอบ & วิเคราะห์ข้อมูล"
        desc="ควบคุมมาตรฐานขั้นตอนการทดสอบให้ครบถ้วนและแม่นยำ บันทึกผล จัดการผลการตรวจวิเคราะห์ และแปลผลด้วยระบบ AI"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openModal("generate-report")}>
              <Icons.Doc className="h-[15px] w-[15px]" />
              สร้างรายงาน
            </Button>
            <Button variant="teal" onClick={() => openModal("open-test-order")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              เปิดคำสั่งทดสอบ
            </Button>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="teal" label="คำสั่งทดสอบวันนี้" value="64" trend="▲ 8 เทียบเมื่อวาน" />
        <KpiCard accent="green" label="อนุมัติแล้ว" value="41" trend="ผ่านการทวนสอบ" />
        <KpiCard accent="amber" label="รอทวนสอบ" value="17" trend="รอผู้อนุมัติ" trendDown />
        <KpiCard accent="red" label="ผลผิดปกติ (Flag)" value="6" trend="นอกช่วงอ้างอิง" trendDown />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHead
            icon={<Icons.Test />}
            title="ผลการทดสอบ"
            right={<Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["รหัสทดสอบ", "รายการทดสอบ", "ตัวอย่าง", "ผู้วิเคราะห์", "ผล", "ช่วงอ้างอิง", "สถานะ"].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="transition hover:bg-bg/60">
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium">{t.id}</td>
                    <td className="border-b border-line px-3.5 py-3 font-medium">{t.test}</td>
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[11.5px] text-muted">{t.sample}</td>
                    <td className="border-b border-line px-3.5 py-3">{t.analyst}</td>
                    <td className={`border-b border-line px-3.5 py-3 font-mono font-medium ${flagColor[t.flag]}`}>{t.result}</td>
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[11.5px] text-muted">{t.ref}</td>
                    <td className="border-b border-line px-3.5 py-3">
                      <Tag {...t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div>
          <div className="relative overflow-hidden rounded-[10px] border border-line bg-gradient-to-br from-teal-bg to-panel p-5 text-ink shadow-card">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(10,147,150,0.35),transparent_70%)]" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/20 px-2.5 py-1 font-mono text-[10.5px] tracking-[1px] text-teal">
              <Icons.Ai className="h-3.5 w-3.5" />
              AI ANALYSIS · เร็ว ๆ นี้
            </span>
            <h3 className="relative mb-1.5 mt-3.5 font-display text-[16px] text-ink">วิเคราะห์และแปลผลด้วย AI</h3>
            <p className="relative text-[12.5px] leading-relaxed text-muted">
              ระบบ AI ช่วยตรวจจับความผิดปกติ แนวโน้ม และให้คำแนะนำการทวนสอบผลอัตโนมัติ (ฟังก์ชันเสริมในอนาคต)
            </p>
            <div className="relative mt-3.5 rounded-lg border border-line bg-bg-2 px-3.5 py-3">
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <Icons.Bolt className="h-3.5 w-3.5" />
                ตรวจพบแนวโน้ม
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted">
                ค่า COD ของน้ำเสีย (TST-88399) สูงกว่าค่าเฉลี่ย 7 วันถึง 2.8 เท่า — แนะนำให้ทวนสอบซ้ำและตรวจสอบแหล่งที่มา
              </div>
            </div>
            <div className="relative mt-3.5 rounded-lg border border-line bg-bg-2 px-3.5 py-3">
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
                <Icons.Check className="h-3.5 w-3.5" />
                ควบคุมคุณภาพ
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted">
                ผลทดสอบ 98.2% อยู่ในเกณฑ์ควบคุม (QC) — ไม่พบสัญญาณ drift ของเครื่องมือ
              </div>
            </div>
          </div>

          <Card className="mt-4">
            <CardHead icon={<Icons.Test />} title="สัดส่วนผลตามสถานะ" />
            <div className="px-[18px] py-3.5">
              <Donut
                items={[
                  { label: "อนุมัติแล้ว", color: "var(--color-green)", value: 64 },
                  { label: "รอทวนสอบ", color: "var(--color-amber)", value: 27 },
                  { label: "ผิดปกติ", color: "var(--color-red)", value: 9 },
                ]}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
