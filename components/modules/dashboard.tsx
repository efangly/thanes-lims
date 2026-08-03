"use client";

import { Icons } from "@/lib/icons";
import { FEED, type ModuleId, type TagTone } from "@/lib/data";
import { Card, CardHead, KpiCard, PageHead, Seg, Tag, BarChart } from "@/components/ui";
import type { ReactNode } from "react";

const feedIcons = {
  Env: <Icons.Env />,
  Sample: <Icons.Sample />,
  Equipment: <Icons.Equipment />,
  Inventory: <Icons.Inventory />,
  Check: <Icons.Check />,
};

const toneBg: Record<TagTone, string> = {
  teal: "bg-teal-bg text-teal-d",
  amber: "bg-amber-bg text-amber",
  red: "bg-red-bg text-red",
  green: "bg-green-bg text-green",
  violet: "bg-violet-bg text-violet",
  grey: "bg-bg-2 text-muted",
};

const workload = [
  { label: "จ", a: 60, b: 20 },
  { label: "อ", a: 75, b: 30 },
  { label: "พ", a: 55, b: 25 },
  { label: "พฤ", a: 70, b: 35 },
  { label: "ศ", a: 80, b: 28 },
  { label: "ส", a: 40, b: 12 },
  { label: "อา", a: 35, b: 10 },
];

function ModuleCard({
  icon,
  tone,
  th,
  en,
  desc,
  stat,
  onClick,
}: {
  icon: ReactNode;
  tone: TagTone;
  th: string;
  en: string;
  desc: string;
  stat: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-[10px] border border-line bg-panel p-[17px] text-left shadow-card transition hover:-translate-y-0.5 hover:border-teal hover:shadow-[0_8px_24px_rgba(13,27,42,0.1)]"
    >
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-[9px] ${toneBg[tone]}`}>
        <span className="h-[21px] w-[21px]">{icon}</span>
      </div>
      <h4 className="font-display text-[14.5px] font-semibold">{th}</h4>
      <div className="mt-0.5 font-mono text-[11px] text-muted-2">{en}</div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">{desc}</p>
      <div className="mt-3 flex items-center gap-1.5 font-mono text-[12px] font-medium text-ink">
        <Icons.Arrow className="h-3 w-3 opacity-60" />
        {stat}
      </div>
    </button>
  );
}

export function DashboardView({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  return (
    <div className="animate-fade">
      <PageHead
        title="ภาพรวมห้องปฏิบัติการ"
        desc="สรุปสถานะทั้ง 6 โมดูลแบบเรียลไทม์ · ข้อมูลซิงก์จากคลาวด์ ทำงานร่วมกันได้แม้อยู่คนละสถานที่"
        actions={<Seg options={["วันนี้", "สัปดาห์นี้", "เดือนนี้"]} />}
      />

      <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="teal" icon={<Icons.Sample />} label="ตัวอย่างที่กำลังดำเนินการ" value="248" unit="ตัวอย่าง" trend="▲ 12 รับเข้าวันนี้" />
        <KpiCard accent="amber" icon={<Icons.Equipment />} label="เครื่องมือรอสอบเทียบ" value="3" unit="เครื่อง" trend="▼ 1 เลยกำหนด" trendDown />
        <KpiCard accent="red" icon={<Icons.Env />} label="การแจ้งเตือนสภาพแวดล้อม" value="2" unit="รายการ" trend="Freezer-B วิกฤต" trendDown />
        <KpiCard accent="green" icon={<Icons.Test />} label="ผลทดสอบรออนุมัติ" value="17" unit="รายการ" trend="▲ 5 พร้อมตรวจ" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHead
            icon={<Icons.Test />}
            title="ปริมาณงานทดสอบรายวัน"
            right={<Seg options={["7 วัน", "30 วัน"]} />}
          />
          <div className="px-5 pb-5 pt-4">
            <BarChart data={workload} />
          </div>
        </Card>

        <Card>
          <CardHead
            icon={<Icons.Bell />}
            title="ความเคลื่อนไหวล่าสุด"
            right={<Tag tone="teal" label="LIVE" />}
          />
          <div className="py-1.5">
            {FEED.map((f, i) => (
              <div key={i} className="flex gap-3 border-b border-line px-[18px] py-[11px] last:border-none">
                <div className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-lg ${toneBg[f.tone]}`}>
                  <span className="h-[15px] w-[15px]">{feedIcons[f.icon]}</span>
                </div>
                <div>
                  <div className="text-[12.5px]">
                    {f.html.text}
                    <b className="font-semibold">{f.html.bold}</b>
                    {f.html.tail}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-2">{f.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard onClick={() => onNavigate("samples")} tone="teal" icon={<Icons.Sample />} th="การจัดการตัวอย่าง" en="Sample Management" desc="บันทึก ติดตาม และรักษา Chain of Custody ตลอดวงจรของตัวอย่าง" stat="248 ตัวอย่างที่ใช้งาน" />
        <ModuleCard onClick={() => onNavigate("equipment")} tone="green" icon={<Icons.Equipment />} th="การจัดการเครื่องมือ" en="Equipment Management" desc="ประวัติการใช้งาน สอบเทียบ บำรุงรักษา และพร้อมรับการตรวจสอบ" stat="32 เครื่อง · 3 รอสอบเทียบ" />
        <ModuleCard onClick={() => onNavigate("environment")} tone="red" icon={<Icons.Env />} th="ควบคุมสภาพแวดล้อม" en="Environmental" desc="ติดตามอุณหภูมิ/ความชื้นเรียลไทม์ แจ้งเตือนเข้าสมาร์ตโฟนทันที" stat="2 การแจ้งเตือนที่ต้องดำเนินการ" />
        <ModuleCard onClick={() => onNavigate("inventory")} tone="amber" icon={<Icons.Inventory />} th="สินค้าคงคลัง" en="Inventory" desc="บริหารสต็อกวัสดุ สารเคมี พร้อมสั่งซื้อซ้ำอัตโนมัติ" stat="2 รายการถึงจุดสั่งซื้อ" />
        <ModuleCard onClick={() => onNavigate("documents")} tone="violet" icon={<Icons.Doc />} th="การจัดการเอกสาร" en="Documents" desc="SOP คู่มือ นโยบาย พร้อมประวัติแก้ไขและสิทธิ์การเข้าถึง" stat="142 เอกสาร · 2 อัปเดตวันนี้" />
        <ModuleCard onClick={() => onNavigate("tests")} tone="teal" icon={<Icons.Test />} th="ทดสอบ & วิเคราะห์" en="Test & Analysis" desc="ควบคุมมาตรฐาน บันทึกผล แปลผลด้วย AI (เร็ว ๆ นี้)" stat="17 ผลรออนุมัติ" />
      </div>
    </div>
  );
}
