"use client";

import { useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import type { CoCStep, Sample } from "@/lib/data";
import { Avatar, Button, Card, CardHead, KpiCard, PageHead, Seg, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiFetch } from "@/lib/api-client";
import { mapCoCStep, type CoCStepDTO } from "@/lib/backend-mappers";

const cocIcons = {
  Plus: <Icons.Plus />,
  Loc: <Icons.Loc />,
  Arrow: <Icons.Arrow />,
  Test: <Icons.Test />,
  Check: <Icons.Check />,
};

const SEG_OPTIONS = ["ทั้งหมด", "กำลังทดสอบ", "รอตรวจ"];

function useCoC(sampleId: string | undefined) {
  const [steps, setSteps] = useState<CoCStep[]>([]);
  useEffect(() => {
    if (!sampleId) {
      setSteps([]);
      return;
    }
    let cancelled = false;
    apiFetch<CoCStepDTO[]>(`/samples/${sampleId}/coc`)
      .then((r) => {
        if (!cancelled) setSteps(r.map(mapCoCStep));
      })
      .catch(() => {
        if (!cancelled) setSteps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sampleId]);
  return steps;
}

export function SamplesView() {
  const { samples, openModal } = useLims();
  const [seg, setSeg] = useState(0);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  const filtered = samples.filter((s) => {
    if (seg === 1) return s.status.label === "กำลังทดสอบ";
    if (seg === 2) return s.status.label.includes("รอตรวจ");
    return true;
  });
  const active = selectedSample && filtered.some((s) => s.id === selectedSample.id) ? selectedSample : filtered[0] ?? null;
  const cocSteps = useCoC(active?.id);

  return (
    <div className="animate-fade">
      <PageHead
        title="การจัดการตัวอย่าง"
        desc="ติดตามตัวอย่างทั่วทั้งห้องปฏิบัติการ พร้อมกำหนดตำแหน่งจัดเก็บและรักษา Chain of Custody ป้องกันการสูญหายระหว่างแผนก"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openModal("scan-barcode")}>
              <Icons.Arrow className="h-[15px] w-[15px]" />
              สแกนบาร์โค้ด
            </Button>
            <Button variant="teal" onClick={() => openModal("add-sample")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              รับตัวอย่างใหม่
            </Button>
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="teal" label="รับเข้าวันนี้" value="12" trend="▲ 3 เทียบเมื่อวาน" />
        <KpiCard accent="green" label="เสร็จสิ้น" value="186" trend="75% ของทั้งหมด" />
        <KpiCard accent="amber" label="รอตรวจสอบ" value="9" trend="ต้องดำเนินการ" trendDown />
        <KpiCard accent="violet" label="ส่งต่อระหว่างแผนก" value="4" trend="อยู่ระหว่างส่งมอบ" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHead
            icon={<Icons.Sample />}
            title="ทะเบียนตัวอย่าง"
            right={<Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />}
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["รหัส / บาร์โค้ด", "ตัวอย่าง", "ผู้ดูแลปัจจุบัน", "ตำแหน่งจัดเก็บ", "สถานะ"].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSample(s)}
                    className={`cursor-pointer transition hover:bg-bg/60 ${active?.id === s.id ? "bg-bg/60" : ""}`}
                  >
                    <td className="border-b border-line px-3.5 py-3">
                      <div className="font-mono text-[12.5px] font-medium text-ink">{s.id}</div>
                      <div className="text-[11.5px] text-muted">{s.recv}</div>
                    </td>
                    <td className="border-b border-line px-3.5 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[11.5px] text-muted">{s.type}</div>
                    </td>
                    <td className="border-b border-line px-3.5 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar initials={s.custodian[0]} size="xs" />
                        {s.custodian}
                      </span>
                    </td>
                    <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px]">{s.loc}</td>
                    <td className="border-b border-line px-3.5 py-3">
                      <Tag {...s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead
            icon={<Icons.Shield />}
            title="Chain of Custody"
            right={<span className="font-mono text-[11.5px] text-muted">{active?.id ?? "—"}</span>}
          />
          <div className="px-5 pb-3.5 pt-1.5">
            {cocSteps.length === 0 && (
              <div className="py-4 text-center text-[12.5px] text-muted">ไม่มีข้อมูล Chain of Custody</div>
            )}
            {cocSteps.map((c, i) => {
              const isLast = i === cocSteps.length - 1;
              const dotCls =
                c.state === "done"
                  ? "bg-teal border-teal text-white"
                  : c.state === "now"
                  ? "bg-panel border-amber text-amber animate-ring"
                  : "bg-teal-bg border-teal text-teal-d";
              return (
                <div key={i} className="relative flex gap-3.5 py-3">
                  {!isLast && <span className="absolute left-[15px] top-[34px] -bottom-3 w-0.5 bg-line" />}
                  <div className={`z-10 grid h-8 w-8 flex-none place-items-center rounded-full border-2 ${dotCls}`}>
                    <span className="h-[15px] w-[15px]">{cocIcons[c.icon]}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium">{c.title}</div>
                    <div className="mt-0.5 font-mono text-[11.5px] text-muted">{c.meta}</div>
                    {c.who !== "—" && (
                      <div className="mt-[3px] flex items-center gap-1.5 text-[12px] text-muted">
                        <Icons.User className="h-3 w-3 opacity-60" />
                        ผู้ดูแล: {c.who}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 px-5 pb-4 text-[11.5px] text-muted-2">
            <Icons.Shield className="h-[13px] w-[13px]" />
            ทุกการเปลี่ยนมือถูกบันทึกอัตโนมัติ ป้องกันข้อมูลสูญหาย
          </div>
        </Card>
      </div>
    </div>
  );
}
