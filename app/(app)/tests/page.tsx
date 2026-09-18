"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { Icons } from "@/lib/icons";
import { Button, Card, CardBody, CardHead, Donut, KpiCard, PageHead, Pagination, Seg, Tag, usePagination } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage } from "@/lib/api-client";

const flagColor = { hi: "text-red", lo: "text-amber", ok: "text-green" };
const SEG_OPTIONS = ["ทั้งหมด", "รอทวนสอบ", "ผิดปกติ"];

export default function TestsPage() {
  return (
    <Suspense fallback={null}>
      <TestsPageInner />
    </Suspense>
  );
}

function TestsPageInner() {
  const { tests, openModal, approveTest, pushToast } = useLims();
  const [seg, setSeg] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = useCallback(
    async (id: string) => {
      setApprovingId(id);
      try {
        await approveTest(id);
        pushToast(`อนุมัติผลทดสอบ ${id} แล้ว`);
      } catch (err) {
        pushToast(apiErrorMessage(err), "red");
      } finally {
        setApprovingId(null);
      }
    },
    [approveTest, pushToast]
  );

  const filtered = tests.filter((t) => {
    if (seg === 1) return t.status.label === "รอทวนสอบ";
    if (seg === 2) return t.flag !== "ok";
    return true;
  });

  const pager = usePagination(filtered, { resetKey: String(seg) });

  const kpi = useMemo(() => {
    const approved = tests.filter((t) => t.status.label === "อนุมัติแล้ว").length;
    const pending = tests.filter((t) => t.status.label === "รอทวนสอบ").length;
    const analyzing = tests.filter((t) => t.status.label === "กำลังวิเคราะห์").length;
    const flagged = tests.filter((t) => t.flag !== "ok").length;
    return { total: tests.length, approved, pending, analyzing, flagged };
  }, [tests]);

  const donutItems = useMemo(() => {
    if (tests.length === 0) return [];
    const pct = (label: string) =>
      Math.round((tests.filter((t) => t.status.label === label).length / tests.length) * 100);
    return [
      { label: "อนุมัติแล้ว", color: "var(--color-green)", value: pct("อนุมัติแล้ว") },
      { label: "กำลังวิเคราะห์", color: "var(--color-teal)", value: pct("กำลังวิเคราะห์") },
      { label: "รอทวนสอบ", color: "var(--color-amber)", value: pct("รอทวนสอบ") },
    ].filter((d) => d.value > 0);
  }, [tests]);

  return (
    <div className="animate-fade lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
      <PageHead
        title="การจัดการทดสอบ & วิเคราะห์ข้อมูล"
        desc="ควบคุมมาตรฐานขั้นตอนการทดสอบให้ครบถ้วนและแม่นยำ บันทึกผล จัดการผลการตรวจวิเคราะห์ และแปลผลด้วยระบบ AI"
        primary={{
          label: "เปิดคำสั่งทดสอบ",
          icon: <Icons.Plus className="h-3.75 w-3.75" />,
          onClick: () => openModal("open-test-order"),
        }}
        secondary={[
          {
            label: "สร้างรายงาน",
            icon: <Icons.Doc className="h-3.75 w-3.75" />,
            onClick: () => openModal("generate-report"),
          },
        ]}
      />

      <div className="mb-5.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="teal" label="ผลทดสอบทั้งหมด" value={String(kpi.total)} trend={`กำลังวิเคราะห์ ${kpi.analyzing} รายการ`} />
        <KpiCard accent="green" label="อนุมัติแล้ว" value={String(kpi.approved)} trend="ผ่านการทวนสอบ" />
        <KpiCard accent="amber" label="รอทวนสอบ" value={String(kpi.pending)} trend="รอผู้อนุมัติ" trendDown={kpi.pending > 0} />
        <KpiCard accent="red" label="ผลผิดปกติ (Flag)" value={String(kpi.flagged)} trend="นอกช่วงอ้างอิง" trendDown={kpi.flagged > 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr] lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <Card className="lg:flex lg:min-h-0 lg:flex-col">
          <CardHead
            icon={<Icons.Test />}
            title="ผลการทดสอบ"
            right={<Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />}
          />
          <div className="overflow-x-auto lg:min-h-0 lg:flex-1">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["รหัสทดสอบ", "รายการทดสอบ", "ตัวอย่าง", "ผู้วิเคราะห์", "ผล", "ช่วงอ้างอิง", "สถานะ", "การดำเนินการ"].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-2.75 text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pager.pageItems.map((t) => (
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
                    <td className="border-b border-line px-3.5 py-3">
                      {t.status.label === "กำลังวิเคราะห์" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal("submit-test-result", { testResultId: t.id })}
                        >
                          <Icons.Check className="h-3.25 w-3.25" />
                          บันทึกผล
                        </Button>
                      )}
                      {t.status.label === "รอทวนสอบ" && (
                        <Button
                          variant="teal"
                          size="sm"
                          onClick={() => handleApprove(t.id)}
                          disabled={approvingId === t.id}
                        >
                          <Icons.Check className="h-3.25 w-3.25" />
                          {approvingId === t.id ? "กำลังอนุมัติ…" : "อนุมัติ"}
                        </Button>
                      )}
                      {t.status.label === "อนุมัติแล้ว" && <span className="text-[11.5px] text-muted-2">—</span>}
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
            unit="รายการ"
          />
        </Card>

        <div className="lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className="relative overflow-hidden rounded-[10px] border border-line bg-gradient-to-br from-teal-bg to-panel p-5 text-ink shadow-card">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(10,147,150,0.35),transparent_70%)]" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/20 px-2.5 py-1 font-mono text-[10.5px] tracking-[1px] text-teal">
              <Icons.Ai className="h-3.5 w-3.5" />
              AI ANALYSIS · เร็ว ๆ นี้
            </span>
            <h3 className="relative mb-1.5 mt-3.5 font-display text-[16px] text-ink">วิเคราะห์และแปลผลด้วย AI</h3>
            <p className="relative text-[12.5px] leading-relaxed text-muted">
              ระบบ AI ช่วยตรวจจับความผิดปกติ แนวโน้ม และให้คำแนะนำการทวนสอบผลอัตโนมัติ —
              อยู่ระหว่างการพัฒนา ยังไม่เปิดใช้งาน
            </p>
          </div>

          <Card className="mt-4">
            <CardHead icon={<Icons.Test />} title="สัดส่วนผลตามสถานะ" />
            <CardBody>
              {donutItems.length > 0 ? (
                <Donut items={donutItems} />
              ) : (
                <div className="py-6 text-center text-[12.5px] text-muted">ยังไม่มีผลทดสอบ</div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
