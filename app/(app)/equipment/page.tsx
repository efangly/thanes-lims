"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/lib/icons";
import { Card, CardHead, Input, KpiCard, PageHead, Pagination, Ring, Seg, Tag, usePagination } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useUiStore } from "@/lib/stores/ui-store";
import { useCan } from "@/lib/auth-context";
import { useFullPath } from "@/lib/use-full-path";
import { listAllSchedules, type Schedule } from "@/lib/equipment-api";
import { calibrationStanding, groupSchedules, soonestDueLabel } from "@/lib/calibration-status";
import { DUE_STATUS_RANK, dueStatusTag } from "@/lib/backend-mappers";
import type { DueStatus, Equipment } from "@/lib/data";

function LocationCell({ locationId }: { locationId: string | null }) {
  const { path } = useFullPath(locationId);
  return <span className="font-mono text-[12px] text-muted">{path ?? "—"}</span>;
}

const SEG_OPTIONS = ["ทั้งหมด", "ต้องดำเนินการ"];

const alertCls: Record<"red" | "amber", string> = {
  red: "bg-red-bg text-red",
  amber: "bg-amber-bg text-amber",
};

/** URL filters, same names as the backend's `GET /equipment` query (dashboard cards link here with them). */
const FILTERS = [
  { param: "overall_status", field: "overallStatus", label: "สถานะรวม" },
  { param: "calibration_status", field: "calStatus", label: "Cal" },
  { param: "maintenance_status", field: "maStatus", label: "MA" },
] as const satisfies readonly { param: string; field: keyof Equipment; label: string }[];

const DUE_STATUSES: readonly DueStatus[] = ["ready", "due_soon", "overdue", "none"];
const isDueStatus = (v: string | null): v is DueStatus => DUE_STATUSES.includes(v as DueStatus);
const needsAction = (s: DueStatus) => s === "overdue" || s === "due_soon";

const rowAccent: Record<DueStatus, string> = {
  overdue: "shadow-[inset_3px_0_0_var(--color-red)]",
  due_soon: "shadow-[inset_3px_0_0_var(--color-amber)]",
  ready: "",
  none: "",
};

const ringColor: Record<DueStatus, string> = {
  overdue: "var(--color-red)",
  due_soon: "var(--color-amber)",
  ready: "var(--color-green)",
  none: "var(--color-line)",
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
  const searchParams = useSearchParams();
  const { equipment, documents } = useLims();
  const openModal = useUiStore((s) => s.openModal);
  const canEdit = useCan("equipment:edit");
  const canApprove = useCan("equipment:approve");
  const [seg, setSeg] = useState(0);
  const [q, setQ] = useState("");
  const [calSchedules, setCalSchedules] = useState<Schedule[]>([]);
  const [maSchedules, setMaSchedules] = useState<Schedule[]>([]);

  // Both kinds in one request each — grouped by equipment_id here, never fetched per machine.
  useEffect(() => {
    listAllSchedules("calibration")
      .then(setCalSchedules)
      .catch(() => setCalSchedules([]));
    listAllSchedules("maintenance")
      .then(setMaSchedules)
      .catch(() => setMaSchedules([]));
  }, []);

  const calBy = useMemo(() => groupSchedules(calSchedules), [calSchedules]);
  const maBy = useMemo(() => groupSchedules(maSchedules), [maSchedules]);

  // Status badges come from the backend (ADR-0020); schedules only supply the due dates and the ring.
  const rows = equipment
    .map((e) => {
      const cal = calibrationStanding(calBy.get(e.id) ?? []);
      return {
        e,
        calDue: cal.hasSchedule ? cal.nextDueLabel : e.next,
        calPct: cal.pct ?? e.cal,
        maDue: soonestDueLabel(maBy.get(e.id) ?? []),
      };
    })
    .sort((a, b) => DUE_STATUS_RANK[b.e.overallStatus] - DUE_STATUS_RANK[a.e.overallStatus]);

  const active = FILTERS.flatMap((f) => {
    const v = searchParams.get(f.param);
    return isDueStatus(v) ? [{ ...f, value: v }] : [];
  });

  const setFilter = (param: string | null, value?: DueStatus) => {
    const next = new URLSearchParams();
    if (param && value) next.set(param, value);
    const qs = next.toString();
    router.replace(qs ? `/equipment?${qs}` : "/equipment");
  };

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter(({ e }) => {
    if (seg === 1 && !needsAction(e.overallStatus)) return false;
    if (active.some((f) => e[f.field] !== f.value)) return false;
    if (needle && !e.name.toLowerCase().includes(needle) && !e.sn.toLowerCase().includes(needle)) return false;
    return true;
  });

  const filterKey = active.map((f) => `${f.param}=${f.value}`).join("&");
  const pager = usePagination(filtered, { resetKey: `${seg}|${needle}|${filterKey}` });

  const count = (pred: (e: Equipment) => boolean) => equipment.filter(pred).length;
  const readyCount = count((e) => e.overallStatus === "ready");
  const calDue = count((e) => needsAction(e.calStatus));
  const calOverdue = count((e) => e.calStatus === "overdue");
  const maDue = count((e) => needsAction(e.maStatus));
  const maOverdue = count((e) => e.maStatus === "overdue");
  const maNone = count((e) => e.maStatus === "none");

  // การแจ้งเตือน — Cal และ MA ที่ใกล้กำหนดหรือเลยกำหนด เลยกำหนดขึ้นก่อน
  const alerts = rows
    .flatMap(({ e, calDue, maDue }) => [
      needsAction(e.calStatus) && {
        id: `${e.id}-cal`,
        eqId: e.id,
        tone: (e.calStatus === "overdue" ? "red" : "amber") as "red" | "amber",
        title: e.name,
        msg: e.calStatus === "overdue" ? "เลยกำหนดสอบเทียบ" : "ใกล้ถึงกำหนดสอบเทียบ",
        time: calDue,
      },
      needsAction(e.maStatus) && {
        id: `${e.id}-ma`,
        eqId: e.id,
        tone: (e.maStatus === "overdue" ? "red" : "amber") as "red" | "amber",
        title: e.name,
        msg: e.maStatus === "overdue" ? "เลยกำหนดบำรุงรักษา (MA)" : "ใกล้ถึงกำหนดบำรุงรักษา (MA)",
        time: maDue ?? "—",
      },
    ])
    .filter((a) => a !== false)
    .sort((a, b) => (b.tone === "red" ? 1 : 0) - (a.tone === "red" ? 1 : 0));

  // เอกสารประกอบเครื่องมือ — เอกสารจริงที่ผูกกับเครื่องมือ
  const equipmentDocs = documents.filter((d) => d.equipmentId !== null);

  const secondary = [
    {
      label: "ผลการสอบเทียบ",
      icon: <Icons.Check className="h-3.75 w-3.75" />,
      onClick: () => router.push("/equipment/calibration-results"),
    },
    canApprove && {
      label: "บันทึกผลสอบเทียบ",
      icon: <Icons.Plus className="h-3.75 w-3.75" />,
      onClick: () => openModal("record-calibration"),
    },
    canEdit && {
      label: "บันทึก MA",
      icon: <Icons.Plus className="h-3.75 w-3.75" />,
      onClick: () => openModal("record-maintenance"),
    },
    {
      label: "ส่งออกรายงาน Audit",
      icon: <Icons.Doc className="h-3.75 w-3.75" />,
      onClick: () => openModal("export-audit-report"),
    },
  ].filter((a) => a !== false);

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
        secondary={secondary}
      />

      <div className="mb-5.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          accent="green"
          label="เครื่องมือทั้งหมด"
          value={String(equipment.length)}
          trend={`พร้อมใช้ ${readyCount} เครื่อง`}
          onClick={() => setFilter(null)}
        />
        <KpiCard
          accent="amber"
          label="Cal ใกล้/เลยกำหนด"
          value={String(calDue)}
          trend={calOverdue > 0 ? `${calOverdue} เลยกำหนด` : "ภายใน 14 วัน"}
          trendDown={calDue > 0}
          onClick={() => setFilter("calibration_status", calOverdue > 0 ? "overdue" : "due_soon")}
        />
        <KpiCard
          accent="red"
          label="MA ใกล้/เลยกำหนด"
          value={String(maDue)}
          trend={maOverdue > 0 ? `${maOverdue} เลยกำหนด` : "ภายใน 14 วัน"}
          trendDown={maDue > 0}
          onClick={() => setFilter("maintenance_status", maOverdue > 0 ? "overdue" : "due_soon")}
        />
        <KpiCard
          accent="teal"
          label="ยังไม่มีแผน MA"
          value={String(maNone)}
          trend="รอกำหนดรอบบำรุงรักษา"
          onClick={() => setFilter("maintenance_status", "none")}
        />
      </div>

      <Card>
        <CardHead
          icon={<Icons.Equipment />}
          title="ทะเบียนเครื่องมือ & สถานะ Cal / MA"
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
        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 text-[12px]">
            <span className="text-muted">กรอง:</span>
            {active.map((f) => (
              <button
                key={f.param}
                onClick={() => setFilter(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-0.75 font-medium hover:border-teal"
              >
                {dueStatusTag(f.value, f.label).label}
                <span aria-hidden className="text-muted">✕</span>
              </button>
            ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {["รหัส", "เครื่องมือ", "S/N", "ตำแหน่ง", "Cal ถัดไป", "MA ถัดไป", "Cal", "MA"].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-2.75 text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map(({ e, calDue, calPct, maDue }) => (
                <tr
                  key={e.id}
                  onClick={() => router.push(`/equipment/${e.id}`)}
                  className={`cursor-pointer transition hover:bg-bg/60 ${rowAccent[e.overallStatus]}`}
                >
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] font-medium">{e.id}</td>
                  <td className="border-b border-line px-3.5 py-3 font-medium">{e.name}</td>
                  <td className="border-b border-line px-3.5 py-3 font-mono text-[12px] text-muted">{e.sn || "—"}</td>
                  <td className="border-b border-line px-3.5 py-3">
                    <LocationCell locationId={e.locationId} />
                  </td>
                  <td className="border-b border-line px-3.5 py-3">
                    <span className="flex items-center gap-2.5 whitespace-nowrap font-mono text-[12.5px]">
                      <Ring pct={calPct} color={ringColor[e.calStatus]} />
                      {calDue}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3.5 py-3 font-mono text-[12.5px]">
                    {maDue ?? <span className="text-muted-2">—</span>}
                  </td>
                  <td className="border-b border-line px-3.5 py-3">
                    <Tag {...dueStatusTag(e.calStatus)} />
                  </td>
                  <td className="border-b border-line px-3.5 py-3">
                    <Tag {...dueStatusTag(e.maStatus)} />
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
          <CardHead icon={<Icons.Clock />} title="การแจ้งเตือน Cal / MA" />
          <div>
            {alerts.length === 0 && (
              <div className="px-4 py-6 text-center text-[12.5px] text-muted">ไม่มีเครื่องมือที่ใกล้กำหนดหรือเลยกำหนดสอบเทียบ / MA</div>
            )}
            {alerts.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/equipment/${a.eqId}`)}
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
