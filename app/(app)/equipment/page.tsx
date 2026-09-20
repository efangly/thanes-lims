"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/lib/icons";
import { Card, CardHead, Input, KpiCard, PageHead, Pagination, Ring, Seg, Tag, usePagination } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useUiStore } from "@/lib/stores/ui-store";
import { useFullPath } from "@/lib/use-full-path";
import { listAllSchedules, type CalibrationSchedule } from "@/lib/equipment-api";
import { calibrationStanding, groupSchedules } from "@/lib/calibration-status";

function LocationCell({ locationId }: { locationId: string | null }) {
  const { path } = useFullPath(locationId);
  return <span className="font-mono text-[12px] text-muted">{path ?? "—"}</span>;
}

const SEG_OPTIONS = ["ทั้งหมด", "ต้องดำเนินการ"];

const alertCls: Record<"red" | "amber", string> = {
  red: "bg-red-bg text-red",
  amber: "bg-amber-bg text-amber",
};

export default function EquipmentPage() {
  return (
    <Suspense fallback={null}>
      <EquipmentPageInner />
    </Suspense>
  );
}

function EquipmentPageInner() {
  const router = useRouter();
  const { equipment, documents } = useLims();
  const openModal = useUiStore((s) => s.openModal);
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

  const pager = usePagination(filtered, { resetKey: `${seg}|${needle}` });

  const readyCount = rows.filter(({ standing }) => standing.status.tone === "green").length;
  const dueSoonCount = rows.filter(({ standing }) => standing.status.tone === "amber").length;
  const overdueCount = rows.filter(({ standing }) => standing.status.tone === "red").length;
  const noScheduleCount = rows.filter(({ standing }) => !standing.hasSchedule).length;

  // การแจ้งเตือนสอบเทียบ — เครื่องที่ใกล้กำหนดหรือเลยกำหนด (ADR-0006 derive จาก schedule)
  const calAlerts = rows
    .filter(({ standing }) => standing.status.tone === "amber" || standing.status.tone === "red")
    .sort((a, b) => (b.standing.status.tone === "red" ? 1 : 0) - (a.standing.status.tone === "red" ? 1 : 0))
    .map(({ e, standing }) => ({
      id: e.id,
      tone: standing.status.tone as "red" | "amber",
      title: e.name,
      msg: standing.status.tone === "red" ? "เลยกำหนดสอบเทียบ" : "ใกล้ถึงกำหนดสอบเทียบ",
      time: standing.nextDueLabel,
    }));

  // เอกสารประกอบเครื่องมือ — เอกสารจริงที่ผูกกับเครื่องมือ
  const equipmentDocs = documents.filter((d) => d.equipmentId !== null);

  return (
    <div className="animate-fade">
      <PageHead
        title="การจัดการเครื่องมือ"
        desc="บันทึกประวัติการใช้งาน ใบรับรองสอบเทียบ ประวัติบำรุงรักษา พร้อมแจ้งเตือนอัตโนมัติเมื่อถึงกำหนด — พร้อมรับการตรวจสอบ (Audit) เสมอ"
        primary={{
          label: "เพิ่มเครื่องมือ",
          icon: <Icons.Plus className="h-3.75 w-3.75" />,
          onClick: () => openModal("add-equipment"),
        }}
        secondary={[
          {
            label: "ผลการสอบเทียบ",
            icon: <Icons.Check className="h-3.75 w-3.75" />,
            onClick: () => router.push("/equipment/calibration-results"),
          },
          {
            label: "บันทึกผลสอบเทียบ",
            icon: <Icons.Plus className="h-3.75 w-3.75" />,
            onClick: () => openModal("record-calibration"),
          },
          {
            label: "ส่งออกรายงาน Audit",
            icon: <Icons.Doc className="h-3.75 w-3.75" />,
            onClick: () => openModal("export-audit-report"),
          },
        ]}
      />

      <div className="mb-5.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="green" label="เครื่องมือทั้งหมด" value={String(equipment.length)} trend={`พร้อมใช้ ${readyCount} เครื่อง`} />
        <KpiCard accent="amber" label="ใกล้กำหนดสอบเทียบ" value={String(dueSoonCount)} trend="ภายใน 14 วัน" trendDown={dueSoonCount > 0} />
        <KpiCard accent="red" label="เลยกำหนด" value={String(overdueCount)} trend={overdueCount > 0 ? "ต้องดำเนินการด่วน" : "ไม่มีรายการ"} trendDown={overdueCount > 0} />
        <KpiCard accent="teal" label="ยังไม่ตั้งรอบสอบเทียบ" value={String(noScheduleCount)} trend="รอกำหนดรอบ" />
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
                className="w-50"
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
                  <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-2.75 text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map(({ e, standing }) => (
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
        <Pagination
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          rangeStart={pager.rangeStart}
          rangeEnd={pager.rangeEnd}
          onPage={pager.setPage}
          unit="เครื่องมือ"
        />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHead icon={<Icons.Clock />} title="การแจ้งเตือนสอบเทียบ" />
          <div>
            {calAlerts.length === 0 && (
              <div className="px-4 py-6 text-center text-[12.5px] text-muted">ไม่มีเครื่องมือที่ใกล้กำหนดหรือเลยกำหนดสอบเทียบ</div>
            )}
            {calAlerts.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/equipment/${a.id}`)}
                className="flex w-full items-start gap-3 border-b border-line px-4 py-3.25 text-left transition last:border-none hover:bg-bg/60"
              >
                <div className={`grid h-8.5 w-8.5 flex-none place-items-center rounded-[9px] ${alertCls[a.tone]}`}>
                  <span className="h-4.25 w-4.25">
                    <Icons.Equipment />
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{a.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{a.msg}</div>
                </div>
                <div className="whitespace-nowrap font-mono text-[10.5px] text-muted-2">{a.time}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon={<Icons.Doc />} title="เอกสารประกอบเครื่องมือ" />
          <div>
            {equipmentDocs.length === 0 && (
              <div className="px-4.5 py-6 text-center text-[12.5px] text-muted">ยังไม่มีเอกสารที่ผูกกับเครื่องมือ</div>
            )}
            {equipmentDocs.map((d) => (
              <button
                key={d.id}
                onClick={() => router.push(`/equipment/${d.equipmentId}`)}
                className="flex w-full items-center gap-3 border-b border-line px-4.5 py-3 text-left transition last:border-none hover:bg-bg/60"
              >
                <div className="grid h-8.5 w-8.5 flex-none place-items-center rounded-lg bg-violet-bg text-violet">
                  <Icons.Doc className="h-4.25 w-4.25" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[11.5px] text-muted">{equipment.find((e) => e.id === d.equipmentId)?.name ?? d.equipmentId}</div>
                </div>
                <span className="rounded-[5px] border border-line bg-bg px-1.75 py-0.5 font-mono text-[11px] text-muted">
                  {d.type}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
