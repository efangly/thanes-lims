"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/lib/icons";
import type { CoCStep, Sample } from "@/lib/data";
import {
  Avatar,
  Button,
  Card,
  CardHead,
  PageHead,
  Pagination,
  ReadoutStrip,
  Seg,
  Tag,
  usePagination,
} from "@/components/ui";
import { ResizablePanels, type PanelDef } from "@/components/resizable-panels";
import { usePanelLayout } from "@/lib/use-panel-layout";
import { useLims } from "@/components/lims-data-context";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";
import { mapCoCStep, type CoCStepDTO } from "@/lib/backend-mappers";
import { useFullPath } from "@/lib/use-full-path";
import { PutAwaySampleModal } from "@/components/modals/put-away-sample";
import { ScanInput } from "@/components/scan-input";
import {
  hasSampleFilter,
  loadStickerPrefs,
  openStickerInNewTab,
  searchSamples,
  type SampleFilter,
} from "@/lib/samples-api";

const cocIcons = {
  Plus: <Icons.Plus />,
  Loc: <Icons.Loc />,
  Arrow: <Icons.Arrow />,
  Test: <Icons.Test />,
  Check: <Icons.Check />,
};

const SEG_OPTIONS = ["ทั้งหมด", "กำลังทดสอบ", "รอตรวจ"];

const PANEL_DEFAULTS = { widths: [1, 1.35, 1], collapsed: [false, false, false] };
const PANEL_KEY = "lims.samples.panels";

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

/* ---------- Panel 1: compact registry list ---------- */
const SampleList = memo(function SampleList({
  samples,
  selectedId,
  onSelect,
}: {
  samples: Sample[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (samples.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[12.5px] text-muted">ไม่พบตัวอย่างที่ตรงกับเงื่อนไข</div>
    );
  }
  return (
    <ul>
      {samples.map((s) => {
        const isSel = selectedId === s.id;
        return (
          <li key={s.id}>
            <button
              onClick={() => onSelect(s.id)}
              className={`flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left transition ${
                isSel ? "bg-accent-bg" : "hover:bg-bg-2"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12px] font-medium text-ink">{s.id}</span>
                <span className="block truncate text-[12px] text-muted">{s.name}</span>
              </span>
              <Tag {...s.status} />
            </button>
          </li>
        );
      })}
    </ul>
  );
});

/* ---------- Panel 2: sample record ---------- */
function SampleRecord({
  sample,
  notFound,
  onPutAway,
  onReprint,
}: {
  sample: Sample | null;
  notFound: boolean;
  onPutAway: () => void;
  onReprint: (id: string) => void;
}) {
  const { path: fullPath, loading: pathLoading } = useFullPath(sample?.locationId);

  if (!sample) {
    return (
      <Card>
        <div className="px-5 py-10 text-center text-[12.5px] text-muted">
          {notFound ? "ไม่พบตัวอย่างนี้" : "เลือกตัวอย่างจากทะเบียน"}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHead
          icon={<Icons.Sample />}
          title={sample.id}
          right={<Tag {...sample.status} />}
        />
        <div className="divide-y divide-line">
          <Row label="ตัวอย่าง" value={`${sample.name} · ${sample.type}`} />
          <Row
            label="Barcode ID"
            value={
              sample.barcodeId ? (
                <span className="flex items-center justify-end gap-1.5">
                  <span className="font-mono text-[12px]">{sample.barcodeId}</span>
                  <button
                    onClick={() => onReprint(sample.id)}
                    title="พิมพ์สติ๊กเกอร์ซ้ำ"
                    className="grid h-6 w-6 place-items-center rounded text-muted transition hover:bg-bg-2 hover:text-ink"
                  >
                    <Icons.Doc className="h-[13px] w-[13px]" />
                  </button>
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="ผู้ดูแลปัจจุบัน"
            value={
              <span className="flex items-center justify-end gap-2">
                <Avatar initials={sample.custodian?.[0] ?? "?"} size="xs" />
                {sample.custodian}
              </span>
            }
          />
          <Row label="รับเข้า" value={sample.recv} />
        </div>
      </Card>

      <Card>
        <CardHead
          icon={<Icons.Loc />}
          title="ตำแหน่งจัดเก็บ"
          right={
            <Button variant="ghost" size="sm" onClick={onPutAway}>
              <Icons.Loc className="h-[13px] w-[13px]" />
              {sample.locationId ? "ย้ายตำแหน่ง" : "จัดเก็บ"}
            </Button>
          }
        />
        <div className="px-5 py-3.5 font-mono text-[13px]">
          {pathLoading
            ? "กำลังโหลด…"
            : sample.locationId
              ? `${fullPath ?? "…"}${sample.position ? ` · ช่อง ${sample.position}` : ""}`
              : "ยังไม่ได้จัดเก็บ"}
        </div>
      </Card>

      {sample.description && (
        <Card>
          <CardHead icon={<Icons.Doc />} title="รายละเอียด" />
          <div className="whitespace-pre-wrap px-5 py-3.5 text-[13px] text-ink">{sample.description}</div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2.5">
      <span className="flex-none text-[12px] text-muted">{label}</span>
      <span className="text-right text-[13px] text-ink">{value}</span>
    </div>
  );
}

/* ---------- Panel 3: chain of custody ---------- */
function CustodyPanel({ sample, notFound }: { sample: Sample | null; notFound: boolean }) {
  const cocSteps = useCoC(sample?.id);
  return (
    <Card>
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
              ? "bg-accent border-accent text-white"
              : c.state === "now"
                ? "bg-panel border-amber text-amber animate-ring"
                : "bg-accent-bg border-accent text-accent-d";
          return (
            <div key={i} className="relative flex gap-3.5 py-3">
              {!isLast && <span className="absolute left-[15px] top-[34px] -bottom-3 w-0.5 bg-line" />}
              <div className={`z-10 grid h-8 w-8 flex-none place-items-center rounded border-2 ${dotCls}`}>
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
 * หน้า `/samples` — เบราว์เซอร์ 3 พาเนล (ADR-0010 / ADR-0012): ทะเบียน | บันทึกตัวอย่าง |
 * Chain of Custody. ตัวอย่างที่เลือกเก็บใน `?s=<id>` (แหล่งความจริงเดียว, ADR-0005).
 */
export function SamplesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("s");
  const { openModal, pushToast, users } = useLims();
  const [seg, setSeg] = useState(0);
  const [putAwayOpen, setPutAwayOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState(0);

  const [barcode, setBarcode] = useState("");
  const [location, setLocation] = useState("");
  const [custodianUserId, setCustodianUserId] = useState("");

  const { layout, setWidth, toggleCollapsed } = usePanelLayout(PANEL_DEFAULTS, PANEL_KEY);

  const filter = useMemo<SampleFilter>(
    () => ({
      barcodeId: barcode || undefined,
      location: location || undefined,
      custodianUserId: custodianUserId || undefined,
    }),
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
  const pager = usePagination(filtered, { resetKey: `${seg}|${barcode}|${location}|${custodianUserId}` });
  const selectedInList = selectedId ? list.find((s) => s.id === selectedId) ?? null : null;
  const active = selectedInList ?? filtered[0] ?? null;
  const notFound = Boolean(barcode) && !loading && filtered.length === 0;

  const counts = useMemo(() => {
    const testing = list.filter((s) => s.status.label === "กำลังทดสอบ").length;
    const waiting = list.filter((s) => s.status.label.includes("รอตรวจ")).length;
    return { total: list.length, testing, waiting };
  }, [list]);

  const select = useCallback(
    (id: string) => {
      router.replace(`/samples?s=${id}`, { scroll: false });
      setMobilePane(1);
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

  const registryPanel = (
    <Card className="overflow-hidden">
      <CardHead
        icon={<Icons.Sample />}
        title="ทะเบียนตัวอย่าง"
        right={<Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />}
      />
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3">
        <ScanInput onScan={scanResolve} placeholder="สแกน Barcode ID แล้วกด Enter" label="สแกนบาร์โค้ด" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">ชื่อตู้ / ตำแหน่งจัดเก็บ</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="เช่น Fridge-A / Slot-4"
            className="w-full rounded border border-line-2 bg-panel px-[11px] py-2 text-[13px] text-ink outline-none transition focus:border-ink focus:outline focus:outline-1 focus:outline-ink"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">ผู้ดูแล</span>
          <select
            value={custodianUserId}
            onChange={(e) => setCustodianUserId(e.target.value)}
            className="w-full rounded border border-line-2 bg-panel px-[11px] py-2 text-[13px] text-ink outline-none transition focus:border-ink focus:outline focus:outline-1 focus:outline-ink"
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
        <div className="flex items-center justify-between border-b border-line bg-bg-2 px-4 py-2 text-[11.5px] text-muted">
          <span>
            {loading ? "กำลังค้นหา…" : `พบ ${filtered.length} รายการ`}
            {barcode && ` · "${barcode}"`}
          </span>
          <button onClick={clearFilters} className="font-medium text-accent-d hover:underline">
            ล้างตัวกรอง
          </button>
        </div>
      )}
      <div className="max-h-[58vh] overflow-y-auto">
        <SampleList samples={pager.pageItems} selectedId={active?.id ?? null} onSelect={select} />
      </div>
      <Pagination
        page={pager.page}
        totalPages={pager.totalPages}
        total={pager.total}
        rangeStart={pager.rangeStart}
        rangeEnd={pager.rangeEnd}
        onPage={pager.setPage}
        unit="ตัวอย่าง"
      />
    </Card>
  );

  const recordPanel = (
    <div className="flex flex-col gap-4">
      <ReadoutStrip
        className="rounded border border-line bg-panel px-4"
        items={[
          { label: "ทั้งหมด", value: String(counts.total) },
          { label: "กำลังทดสอบ", value: String(counts.testing), tone: "amber" },
          { label: "รอตรวจ", value: String(counts.waiting) },
        ]}
      />
      <SampleRecord
        sample={active}
        notFound={notFound}
        onPutAway={() => setPutAwayOpen(true)}
        onReprint={reprint}
      />
    </div>
  );

  const custodyPanel = <CustodyPanel sample={active} notFound={notFound} />;

  const panels: PanelDef[] = [
    { key: "registry", title: "ทะเบียน", icon: <Icons.Sample />, content: registryPanel },
    { key: "record", title: "บันทึกตัวอย่าง", icon: <Icons.Doc />, content: recordPanel },
    { key: "custody", title: "Chain of Custody", icon: <Icons.Shield />, content: custodyPanel },
  ];

  return (
    <div>
      <PageHead
        title="การจัดการตัวอย่าง"
        desc="ติดตามตัวอย่างทั่วทั้งห้องปฏิบัติการ พร้อมกำหนดตำแหน่งจัดเก็บและรักษา Chain of Custody"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openModal("scan-barcode")}>
              <Icons.Arrow className="h-[15px] w-[15px]" />
              ย้ายตำแหน่ง (สแกน)
            </Button>
            <Button variant="accent" onClick={() => openModal("add-sample")}>
              <Icons.Plus className="h-[15px] w-[15px]" />
              รับตัวอย่างใหม่
            </Button>
          </>
        }
      />

      <ResizablePanels
        panels={panels}
        layout={layout}
        setWidth={setWidth}
        toggleCollapsed={toggleCollapsed}
        mobilePane={mobilePane}
        onMobilePane={setMobilePane}
      />

      <PutAwaySampleModal sample={active} open={putAwayOpen} onClose={() => setPutAwayOpen(false)} />
    </div>
  );
}
