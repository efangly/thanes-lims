"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/lib/icons";
import { Button, Card, CardHead, Input, KpiCard, PageHead, Ring, Seg, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useFullPath } from "@/lib/use-full-path";
import { listAllSchedules, type CalibrationSchedule } from "@/lib/equipment-api";
import { calibrationStanding, groupSchedules } from "@/lib/calibration-status";

function LocationCell({ locationId }: { locationId: string | null }) {
  const { path } = useFullPath(locationId);
  return <span className="font-mono text-[12px] text-muted">{path ?? "—"}</span>;
}

const SEG_OPTIONS = ["ทั้งหมด", "ต้องดำเนินการ"];

const calAlerts = [
  { tone: "red", icon: <Icons.Equipment />, title: "UV-Vis Spectrophotometer", msg: "เลยกำหนดสอบเทียบ 2 วัน — ระงับการใช้งานชั่วคราว", time: "เลยกำหนด", cls: "bg-red-bg text-red" },
  { tone: "amber", icon: <Icons.Equipment />, title: "เครื่องชั่งวิเคราะห์ Mettler", msg: "ถึงกำหนดสอบเทียบใน 7 วัน (28 ก.ค.)", time: "ใน 7 วัน", cls: "bg-amber-bg text-amber" },
  { tone: "teal", icon: <Icons.Check />, title: "เครื่องปั่นเหวี่ยง Hettich", msg: "บำรุงรักษาเชิงป้องกันเสร็จสิ้น", time: "วันนี้", cls: "bg-teal-bg text-teal-d" },
];

const auditDocs = [
  { name: "ใบรับรองสอบเทียบ Real-Time PCR", type: "Calibration Cert", note: "ออกโดยหน่วยงานภายนอก" },
  { name: "คู่มือการใช้งาน + บันทึกฝึกอบรม", type: "Manual + Training", note: "พนักงาน 6 คนผ่านการอบรม" },
  { name: "ประวัติการบำรุงรักษา 12 เดือน", type: "Maintenance Log", note: "ไม่มีเหตุขัดข้องค้าง" },
  { name: "บันทึกปัญหาที่พบ & การแก้ไข", type: "Issue Log", note: "2 รายการปิดแล้ว" },
];

export default function EquipmentPage() {
  const router = useRouter();
  const { equipment, openModal } = useLims();
  const [seg, setSeg] = useState(0);
  const [q, setQ] = useState("");
  const [schedules, setSchedules] = useState<CalibrationSchedule[]>([]);

  useEffect(() => {
    listAllSchedules()
      .then(setSchedules)
      .catch(() => setSchedules([]));
  }, []);

  // ADR-0006: derive the due date / ring / status from each machine's schedules.
  const byEquipment = useMemo(() => groupSchedules(schedules), [schedules]);
  const rows = equipment.map((e) => ({ e, standing: calibrationStanding(byEquipment.get(e.id) ?? []) }));

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter(({ e, standing }) => {
    if (seg === 1 && standing.status.tone === "green") return false;
    if (needle && !e.name.toLowerCase().includes(needle) && !e.sn.toLowerCase().includes(needle)) return false;
    return true;
  });

  return (
    <div className="animate-fade">
      <PageHead
        title="การจัดการเครื่องมือ"
        desc="บันทึกประวัติการใช้งาน ใบรับรองสอบเทียบ ประวัติบำรุงรักษา พร้อมแจ้งเตือนอัตโนมัติเมื่อถึงกำหนด — พร้อมรับการตรวจสอบ (Audit) เสมอ"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push("/equipment/calibration-results")}>
              <Icons.Check className="h-[15px] w-[15px]" />
              ผลการสอบเทียบ
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openModal("record-calibration")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              บันทึกผลสอบเทียบ
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openModal("export-audit-report")}>
              <Icons.Doc className="h-[15px] w-[15px]" />
              ส่งออกรายงาน Audit
            </Button>
            <Button variant="teal" onClick={() => openModal("add-equipment")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              เพิ่มเครื่องมือ
            </Button>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="green" label="เครื่องมือทั้งหมด" value="32" trend="พร้อมใช้ 28 เครื่อง" />
        <KpiCard accent="amber" label="ใกล้กำหนดสอบเทียบ" value="3" trend="ภายใน 7 วัน" trendDown />
        <KpiCard accent="red" label="เลยกำหนด" value="1" trend="UV-Vis Spec" trendDown />
        <KpiCard accent="teal" label="งานบำรุงรักษาเดือนนี้" value="6" trend="เสร็จแล้ว 4" />
      </div>

      <Card>
        <CardHead
          icon={<Icons.Equipment />}
          title="ทะเบียนเครื่องมือ & ตารางสอบเทียบ"
          right={
            <div className="flex items-center gap-2.5">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาชื่อ หรือ S/N"
                className="w-[200px]"
              />
              <Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["รหัส", "เครื่องมือ", "S/N", "ตำแหน่ง", "รอบสอบเทียบถัดไป", "เหลือเวลา", "สถานะ"].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ e, standing }) => (
                <tr
                  key={e.id}
                  onClick={() => router.push(`/equipment/${e.id}`)}
                  className="cursor-pointer transition hover:bg-bg/60"
                >
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium">{e.id}</td>
                  <td className="border-b border-line px-3.5 py-3 font-medium">{e.name}</td>
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12px] text-muted">{e.sn || "—"}</td>
                  <td className="border-b border-line px-3.5 py-3">
                    <LocationCell locationId={e.locationId} />
                  </td>
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">{standing.nextDueLabel}</td>
                  <td className="border-b border-line px-3.5 py-3">
                    {standing.pct === null ? (
                      <span className="text-[11px] text-muted-2">—</span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <Ring pct={standing.pct} color={standing.ringColor} />
                        <span className="font-mono text-[11px] text-muted">{standing.pct}%</span>
                      </span>
                    )}
                  </td>
                  <td className="border-b border-line px-3.5 py-3">
                    <Tag {...standing.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHead icon={<Icons.Clock />} title="การแจ้งเตือนสอบเทียบ & บำรุงรักษา" />
          <div>
            {calAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-line px-4 py-[13px] last:border-none">
                <div className={`grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] ${a.cls}`}>
                  <span className="h-[17px] w-[17px]">{a.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{a.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{a.msg}</div>
                </div>
                <div className="whitespace-nowrap font-mono text-[10.5px] text-muted-2">{a.time}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead
            icon={<Icons.Doc />}
            title="เอกสารประกอบเครื่องมือ (Audit Ready)"
            right={<Tag tone="green" label="ครบถ้วน" />}
          />
          <div>
            {auditDocs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line px-[18px] py-3 transition last:border-none hover:bg-bg/60">
                <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-violet-bg text-violet">
                  <Icons.Doc className="h-[17px] w-[17px]" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[11.5px] text-muted">{d.note}</div>
                </div>
                <span className="rounded-[5px] border border-line bg-bg px-[7px] py-0.5 font-mono text-[11px] text-muted">
                  {d.type}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
