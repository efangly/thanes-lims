"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/lib/icons";
import type { CoCStep, Sample } from "@/lib/data";
import { Avatar, Button, Card, CardHead, KpiCard, PageHead, Seg, Tag } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";
import { mapCoCStep, type CoCStepDTO } from "@/lib/backend-mappers";
import { useFullPath } from "@/lib/use-full-path";
import { PutAwaySampleModal } from "@/components/modals/put-away-sample";
import { ScanInput } from "@/components/scan-input";
import { hasSampleFilter, loadStickerPrefs, openStickerInNewTab, searchSamples, type SampleFilter } from "@/lib/samples-api";

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
    // เก็บ steps เดิมไว้ระหว่างโหลดตัวใหม่ กันแฟลชสถานะว่างตอนสลับตัวอย่าง
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

const SampleTable = memo(function SampleTable({
  samples,
  selectedId,
  onSelect,
  onReprint,
}: {
  samples: Sample[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReprint: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {["รหัสตัวอย่าง", "Barcode ID", "ตัวอย่าง", "ผู้ดูแลปัจจุบัน", "สถานะ"].map((h) => (
              <th key={h} className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`cursor-pointer transition hover:bg-bg/60 ${selectedId === s.id ? "bg-bg/60" : ""}`}
            >
              <td className="border-b border-line px-3.5 py-3">
                <div className="font-mono text-[12.5px] font-medium text-ink">{s.id}</div>
                <div className="text-[11.5px] text-muted">{s.recv}</div>
              </td>
              <td className="whitespace-nowrap border-b border-line px-3.5 py-3">
                {s.barcodeId ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-ink">{s.barcodeId}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReprint(s.id);
                      }}
                      aria-label="พิมพ์สติ๊กเกอร์ซ้ำ"
                      title="พิมพ์สติ๊กเกอร์ซ้ำ"
                      className="grid h-6 w-6 place-items-center rounded text-muted transition hover:bg-bg hover:text-ink"
                    >
                      <Icons.Doc className="h-[13px] w-[13px]" />
                    </button>
                  </span>
                ) : (
                  <span className="text-[11.5px] text-muted-2">—</span>
                )}
              </td>
              <td className="border-b border-line px-3.5 py-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-[11.5px] text-muted">{s.type}</div>
              </td>
              <td className="border-b border-line px-3.5 py-3">
                <span className="flex items-center gap-2">
                  <Avatar initials={s.custodian?.[0] ?? "?"} size="xs" />
                  {s.custodian}
                </span>
              </td>
              <td className="border-b border-line px-3.5 py-3">
                <Tag {...s.status} />
              </td>
            </tr>
          ))}
          {samples.length === 0 && (
            <tr>
              <td colSpan={5} className="border-b border-line px-3.5 py-8 text-center text-[12.5px] text-muted">
                ไม่พบตัวอย่างที่ตรงกับเงื่อนไข
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

function SampleDetailPanel({
  sample,
  notFound,
  onPutAway,
}: {
  sample: Sample | null;
  notFound: boolean;
  onPutAway: () => void;
}) {
  const cocSteps = useCoC(sample?.id);
  const { path: fullPath, loading: pathLoading } = useFullPath(sample?.locationId);

  return (
    <div>
      <Card>
        <CardHead
          icon={<Icons.Loc />}
          title="ตำแหน่งจัดเก็บ"
          right={
            <Button variant="ghost" size="sm" onClick={onPutAway} disabled={!sample}>
              <Icons.Loc className="h-[13px] w-[13px]" />
              {sample?.locationId ? "ย้ายตำแหน่ง" : "จัดเก็บ"}
            </Button>
          }
        />
        <div className="px-5 py-3.5 font-mono text-[13px]">
          {notFound
            ? "ไม่พบตัวอย่างนี้"
            : !sample
            ? "—"
            : pathLoading
            ? "กำลังโหลด…"
            : sample.locationId
            ? `${fullPath ?? "…"}${sample.position ? ` · ช่อง ${sample.position}` : ""}`
            : "ยังไม่ได้จัดเก็บ"}
        </div>
      </Card>

      {sample?.description && (
        <Card className="mt-4">
          <CardHead icon={<Icons.Doc />} title="รายละเอียด" />
          <div className="whitespace-pre-wrap px-5 py-3.5 text-[13px] text-ink">{sample.description}</div>
        </Card>
      )}

      <Card className="mt-4">
        <CardHead
          icon={<Icons.Shield />}
          title="Chain of Custody"
          right={<span className="font-mono text-[11.5px] text-muted">{sample?.id ?? "—"}</span>}
        />
        <div className="px-5 pb-3.5 pt-1.5">
          {cocSteps.length === 0 && (
            <div className="py-4 text-center text-[12.5px] text-muted">
              {notFound ? "ไม่พบตัวอย่างนี้" : "ไม่มีข้อมูล Chain of Custody"}
            </div>
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
  );
}

/**
 * Server-side registry filter — barcode (exact scan), Location leaf name (ILIKE),
 * custodian. When any is set the list comes from `GET /samples?...`; otherwise the
 * shared context list is shown. The status segment filters whichever list on top.
 */
function useSampleRegistry(filter: SampleFilter) {
  const { samples, users, loading } = useLims();
  const [rows, setRows] = useState<Sample[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const active = hasSampleFilter(filter);
  // stable key so the effect only re-runs when a filter value actually changes
  const key = `${filter.barcodeId ?? ""}|${filter.location ?? ""}|${filter.custodianUserId ?? ""}`;

  useEffect(() => {
    if (!active) {
      setRows(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchSamples(filter, nameById)
        .then((r) => {
          if (!cancelled) {
            setRows(r);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setRows([]);
            setError(apiErrorMessage(err));
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, nameById]);

  return {
    list: active ? rows ?? [] : samples,
    loading: active ? searching : loading,
    error,
  };
}

/**
 * หน้า `/samples` หน้าเดียว — ตัวอย่างที่เลือกเก็บใน query param `?s=<id>`
 * (แหล่งความจริงเดียว) ไม่ใช้ selection state ที่ sync กับ URL อีก จึงไม่ remount route ตอนสลับตัวอย่าง
 */
export function SamplesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("s");
  const { openModal, pushToast, users } = useLims();
  const [seg, setSeg] = useState(0);
  const [putAwayOpen, setPutAwayOpen] = useState(false);

  const [barcode, setBarcode] = useState("");
  const [location, setLocation] = useState("");
  const [custodianUserId, setCustodianUserId] = useState("");

  const filter = useMemo<SampleFilter>(
    () => ({ barcodeId: barcode || undefined, location: location || undefined, custodianUserId: custodianUserId || undefined }),
    [barcode, location, custodianUserId]
  );
  const { list, loading, error } = useSampleRegistry(filter);

  useEffect(() => {
    if (error) pushToast(error, "red");
  }, [error, pushToast]);

  const filtered = useMemo(
    () =>
      list.filter((s) => {
        if (seg === 1) return s.status.label === "กำลังทดสอบ";
        if (seg === 2) return s.status.label.includes("รอตรวจ");
        return true;
      }),
    [list, seg]
  );
  const selectedInList = selectedId ? list.find((s) => s.id === selectedId) ?? null : null;
  const active = selectedInList ?? filtered[0] ?? null;
  // "ไม่พบ" เฉพาะตอนค้นด้วยบาร์โค้ดแล้วไม่เจออะไรเลย (ลิงก์ ?s= เก่าที่ถูกกรองออกไม่นับ)
  const notFound = Boolean(barcode) && !loading && filtered.length === 0;

  const select = useCallback(
    (id: string) => {
      router.replace(`/samples?s=${id}`, { scroll: false });
    },
    [router]
  );

  const reprint = useCallback(
    async (id: string) => {
      try {
        await openStickerInNewTab(id, loadStickerPrefs());
      } catch (err) {
        pushToast(apiErrorMessage(err), "red");
      }
    },
    [pushToast]
  );

  const scanResolve = useCallback((code: string) => {
    setBarcode(code);
    return true;
  }, []);

  // เด้งไปตัวอย่างแรกอัตโนมัติเมื่อยังไม่ได้เลือก
  const firstId = filtered[0]?.id;
  const hasSelectedInList = Boolean(selectedInList);
  useEffect(() => {
    if (!loading && firstId && !hasSelectedInList) {
      router.replace(`/samples?s=${firstId}`, { scroll: false });
    }
  }, [loading, firstId, hasSelectedInList, router]);

  const clearFilters = () => {
    setBarcode("");
    setLocation("");
    setCustodianUserId("");
  };
  const anyFilter = Boolean(barcode || location || custodianUserId);

  return (
    <div className="animate-fade">
      <PageHead
        title="การจัดการตัวอย่าง"
        desc="ติดตามตัวอย่างทั่วทั้งห้องปฏิบัติการ พร้อมกำหนดตำแหน่งจัดเก็บและรักษา Chain of Custody ป้องกันการสูญหายระหว่างแผนก"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openModal("scan-barcode")}>
              <Icons.Arrow className="h-[15px] w-[15px]" />
              ย้ายตำแหน่ง (สแกน)
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

          <div className="grid grid-cols-1 gap-3 border-b border-line px-5 py-3.5 sm:grid-cols-[1.2fr_1fr_1fr]">
            <ScanInput
              onScan={scanResolve}
              placeholder="สแกน Barcode ID แล้วกด Enter"
              label="สแกนบาร์โค้ด"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-muted">ชื่อตู้ / ตำแหน่งจัดเก็บ</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น Fridge-A / Slot-4"
                className="w-full rounded-lg border border-line bg-bg px-[11px] py-2 text-[13px] text-ink outline-none transition focus:border-teal"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-muted">ผู้ดูแล</span>
              <select
                value={custodianUserId}
                onChange={(e) => setCustodianUserId(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-[11px] py-2 text-[13px] text-ink outline-none transition focus:border-teal"
              >
                <option value="">ทั้งหมด</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {anyFilter && (
            <div className="flex items-center justify-between border-b border-line bg-bg/40 px-5 py-2 text-[11.5px] text-muted">
              <span>
                {loading ? "กำลังค้นหา…" : `พบ ${filtered.length} รายการ`}
                {barcode && ` · บาร์โค้ด "${barcode}"`}
              </span>
              <button onClick={clearFilters} className="font-medium text-teal-d hover:underline">
                ล้างตัวกรอง
              </button>
            </div>
          )}

          <SampleTable samples={filtered} selectedId={active?.id ?? null} onSelect={select} onReprint={reprint} />
        </Card>

        <SampleDetailPanel sample={active} notFound={notFound} onPutAway={() => setPutAwayOpen(true)} />
      </div>

      <PutAwaySampleModal sample={active} open={putAwayOpen} onClose={() => setPutAwayOpen(false)} />
    </div>
  );
}
