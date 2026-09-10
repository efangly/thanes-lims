"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/lib/icons";
import type { Document, DocHistory } from "@/lib/data";
import { Button, Card, CardHead, KpiCard, PageHead, Pagination, Seg, Tag, usePagination } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { apiFetch } from "@/lib/api-client";
import { mapDocHistory, type DocHistoryDTO } from "@/lib/backend-mappers";
import { docTypeLabel } from "@/lib/documents-api";
import { usePanelLayout } from "@/lib/use-panel-layout";
import { ResizablePanels, type PanelDef } from "@/components/resizable-panels";
import { DocumentPreviewPanel } from "@/components/document-preview-panel";

const SEG_OPTIONS = ["ทั้งหมด", "SOP", "นโยบาย", "แบบฟอร์ม"];
// Match against the canonical lowercase document.Type from the backend.
const SEG_TYPE = ["", "sop", "policy", "form"];

const PANEL_DEFAULTS = { widths: [1, 1.5], collapsed: [false, false] };

function useDocHistory(docId: string | undefined) {
  const [history, setHistory] = useState<DocHistory[]>([]);
  useEffect(() => {
    if (!docId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    apiFetch<DocHistoryDTO[]>(`/documents/${docId}/history`)
      .then((r) => {
        if (!cancelled) setHistory(r.map(mapDocHistory));
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [docId]);
  return history;
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsPageInner />
    </Suspense>
  );
}

function DocumentsPageInner() {
  const { documents, openModal } = useLims();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [seg, setSeg] = useState(0);
  const [mobilePane, setMobilePane] = useState(0);
  const { layout, setWidth, toggleCollapsed } = usePanelLayout(PANEL_DEFAULTS, "lims.documents.panels");

  const filtered = documents.filter((d) => (seg === 0 ? true : d.type === SEG_TYPE[seg]));
  const selectedId = searchParams.get("doc") ?? undefined;
  const active =
    (selectedId && filtered.find((d) => d.id === selectedId)) || filtered[0] || null;
  const history = useDocHistory(active?.id);
  const pager = usePagination(filtered, { resetKey: String(seg) });

  const sopCount = documents.filter((d) => d.type === "sop").length;
  const lockedCount = documents.filter((d) => d.locked).length;
  const restrictedCount = documents.filter((d) => d.locked || d.access !== "ทั่วไป").length;

  const selectDoc = (d: Document) => {
    setMobilePane(1);
    router.replace(`/documents?doc=${encodeURIComponent(d.id)}`, { scroll: false });
  };

  const listPanel = (
    <div className="h-full min-h-[420px] space-y-3 overflow-y-auto pr-0.5 lg:min-h-0">
      <Card className="flex flex-col">
        <CardHead
          icon={<Icons.Doc />}
          title="คลังเอกสาร"
          right={<Seg options={SEG_OPTIONS} value={seg} onChange={setSeg} />}
        />
        <div>
          {pager.pageItems.map((d) => (
            <div
              key={d.id}
              onClick={() => selectDoc(d)}
              className={`flex cursor-pointer items-center gap-3 border-b border-line px-[18px] py-3 transition last:border-none hover:bg-bg/60 ${
                active?.id === d.id ? "bg-bg/60" : ""
              }`}
            >
              <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-violet-bg text-violet">
                <Icons.Doc className="h-[17px] w-[17px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="truncate">{d.name}</span>
                  {d.locked && <Icons.Lock className="h-3 w-3 flex-none text-muted-2" />}
                </div>
                <div className="truncate text-[11.5px] text-muted">
                  {docTypeLabel(d.type)} · แก้ไขล่าสุดโดย {d.by} · {d.date}
                </div>
              </div>
              <Tag tone={d.locked ? "red" : "green"} label={d.access} />
              <span className="rounded-[5px] border border-line bg-bg px-[7px] py-0.5 font-mono text-[11px] text-muted">
                {d.ver}
              </span>
            </div>
          ))}
        </div>
        <Pagination
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          rangeStart={pager.rangeStart}
          rangeEnd={pager.rangeEnd}
          onPage={pager.setPage}
          unit="เอกสาร"
        />
      </Card>

      <Card>
        <CardHead
          icon={<Icons.Clock />}
          title="ประวัติการแก้ไข"
          right={<span className="font-mono text-[11.5px] text-muted">{active?.name ?? "—"}</span>}
        />
        <div className="px-5 pb-3.5 pt-1.5">
          {history.length === 0 && (
            <div className="py-4 text-center text-[12.5px] text-muted">ไม่มีประวัติการแก้ไข</div>
          )}
          {history.map((v, i) => {
            const isFirst = i === 0;
            const isLast = i === history.length - 1;
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
  );

  const panels: PanelDef[] = useMemo(
    () => [
      { key: "list", title: "รายการ", icon: <Icons.Doc className="h-3.5 w-3.5" />, content: listPanel },
      {
        key: "preview",
        title: "พรีวิว",
        icon: <Icons.Doc className="h-3.5 w-3.5" />,
        content: (
          <div className="h-full min-h-[420px] lg:min-h-0">
            <DocumentPreviewPanel doc={active} />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listPanel, active]
  );

  return (
    <div className="animate-fade lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
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

      <div className="mb-[22px] grid flex-none grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard accent="violet" label="เอกสารทั้งหมด" value={String(documents.length)} trend="ควบคุมเวอร์ชัน" />
        <KpiCard accent="teal" label="SOP ที่ใช้งาน" value={String(sopCount)} trend="ขั้นตอนปฏิบัติงานมาตรฐาน" />
        <KpiCard accent="amber" label="เอกสารที่ล็อก" value={String(lockedCount)} trend="แก้ไขไม่ได้" trendDown={lockedCount > 0} />
        <KpiCard accent="red" label="เอกสารจำกัดสิทธิ์" value={String(restrictedCount)} trend="เข้าถึงตามบทบาท" />
      </div>

      <div className="lg:min-h-0 lg:flex-1">
        <ResizablePanels
          panels={panels}
          layout={layout}
          setWidth={setWidth}
          toggleCollapsed={toggleCollapsed}
          mobilePane={mobilePane}
          onMobilePane={setMobilePane}
        />
      </div>
    </div>
  );
}
