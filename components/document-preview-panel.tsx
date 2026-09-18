"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/lib/icons";
import type { Document } from "@/lib/data";
import { Button, Card, Tag } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api-client";
import {
  docTypeLabel,
  getDocumentDownloadUrl,
  getDocumentPreviewObjectUrl,
  isPreviewable,
} from "@/lib/documents-api";

/**
 * Panel 2 of `/documents` (ADR-0013): a header strip with the selected
 * Document's identity + download actions, a collapsible detail block, and an
 * inline Preview of the file. The Preview is the object-storage presigned URL
 * embedded in an iframe; only browser-renderable kinds get one, everything else
 * falls back to a download prompt.
 */
export function DocumentPreviewPanel({ doc }: { doc: Document | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const [nonce, setNonce] = useState(0);

  // `doc` is a fresh object on every parent render (it comes out of an inline
  // .filter().find()), so the effect keys on the stable id + filename, not the
  // object identity — otherwise it re-runs every render and cancels its own
  // in-flight request before it can resolve.
  const docId = doc?.id ?? null;
  const fileName = doc?.fileName ?? "";
  const previewable = !!docId && isPreviewable(fileName);

  useEffect(() => {
    setUrl(null);
    setError(null);
    if (!docId || !previewable) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    getDocumentPreviewObjectUrl(docId)
      .then((u) => {
        objectUrl = u;
        if (cancelled) URL.revokeObjectURL(u);
        else setUrl(u);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, previewable, nonce]);

  const openInNewTab = useCallback(async () => {
    if (!docId) return;
    const tab = window.open("", "_blank");
    try {
      const u = url ?? (await getDocumentDownloadUrl(docId));
      if (tab) tab.location.href = u;
      else window.location.href = u;
    } catch {
      tab?.close();
    }
  }, [docId, url]);

  const download = openInNewTab; // presigned URL: object storage serves it as an attachment/inline by type

  if (!doc) {
    return (
      <Card className="grid h-full min-h-105 place-items-center text-center">
        <div className="text-[13px] text-muted">
          <Icons.Doc className="mx-auto mb-2 h-7 w-7 opacity-40" />
          เลือกเอกสารจากรายการเพื่อดูตัวอย่าง
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex h-full min-h-105 flex-col overflow-hidden">
      {/* Header strip */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-4.5 py-3.25">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-display text-[15px] font-semibold">
            <span className="truncate">{doc.name}</span>
            {doc.locked && <Icons.Lock className="h-3.5 w-3.5 flex-none text-muted-2" />}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Tag tone="grey" label={docTypeLabel(doc.type)} />
            <Tag tone="grey" label={doc.ver} />
            <Tag tone={doc.locked ? "red" : "green"} label={doc.access} />
          </div>
        </div>
        <div className="flex flex-none gap-1.5">
          <Button variant="ghost" size="sm" onClick={download}>
            <Icons.Download className="h-3.5 w-3.5" />
            ดาวน์โหลด
          </Button>
          <button
            onClick={openInNewTab}
            title="เปิดในแท็บใหม่"
            className="grid h-7.5 w-7.5 flex-none place-items-center rounded-lg border border-line text-muted transition hover:bg-bg hover:text-ink"
          >
            <Icons.ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsible detail */}
      <div className="border-b border-line">
        <button
          onClick={() => setShowDetail((s) => !s)}
          className="flex w-full items-center gap-1.5 px-4.5 py-2 text-[11px] font-semibold uppercase tracking-[0.7px] text-muted transition hover:text-ink"
        >
          <Icons.Chevron className={`h-3 w-3 transition ${showDetail ? "rotate-90" : ""}`} />
          รายละเอียดเอกสาร
        </button>
        {showDetail && (
          <dl className="grid gap-x-8 gap-y-3 px-4.5 pb-4 text-[12.5px] [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
            <Detail label="รหัสเอกสาร" value={<span className="font-mono">{doc.id}</span>} />
            <Detail label="เวอร์ชันปัจจุบัน" value={<span className="font-mono">{doc.ver}</span>} />
            <Detail label="แก้ไขล่าสุดโดย" value={doc.by} />
            <Detail label="วันที่" value={doc.date} />
            <Detail label="ระดับการเข้าถึง" value={doc.access} />
            <Detail label="ไฟล์" value={<span className="break-all font-mono">{doc.fileName || "—"}</span>} />
            {doc.equipmentId && (
              <Detail label="ผูกกับเครื่องมือ" value={<span className="font-mono">{doc.equipmentId}</span>} />
            )}
            {doc.calibrationEventId != null && (
              <Detail label="ผูกกับ Calibration Event" value={<span className="font-mono">#{doc.calibrationEventId}</span>} />
            )}
          </dl>
        )}
      </div>

      {/* Preview body. `key={docId}` gives each document its own fresh subtree
          so switching documents remounts the <iframe> cleanly instead of React
          reordering one whose PDF viewer has mutated the DOM under it. If a
          browser extension or policy strips the cross-origin frame, the
          ดาวน์โหลด / เปิดในแท็บใหม่ actions in the header still work. */}
      <div key={docId ?? "none"} className="relative min-h-0 flex-1 bg-bg">
        {!previewable ? (
          <Fallback doc={doc} onDownload={download} />
        ) : error ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="text-[12.5px] text-muted">
              <div className="mb-2 text-red">เปิดตัวอย่างไม่สำเร็จ — {error}</div>
              <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
                <Icons.Refresh className="h-3.5 w-3.5" />
                ลองใหม่
              </Button>
            </div>
          </div>
        ) : url ? (
          // #navpanes=0 tells Chrome's PDF viewer to start with its thumbnail /
          // bookmark side pane collapsed; ignored by the image/text viewers.
          <iframe
            src={`${url}#navpanes=0`}
            title={`ตัวอย่าง ${doc.name}`}
            className="h-full w-full border-0"
          />
        ) : (
          <div className="grid h-full place-items-center text-[12.5px] text-muted">กำลังโหลดตัวอย่าง…</div>
        )}
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-2">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function Fallback({ doc, onDownload }: { doc: Document; onDownload: () => void }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div>
        <Icons.Doc className="mx-auto mb-3 h-10 w-10 text-muted-2" />
        <div className="text-[13px] font-medium">{doc.fileName || "ไฟล์เอกสาร"}</div>
        <div className="mt-1 text-[12px] text-muted">พรีวิวไฟล์ชนิดนี้ในหน้าจอไม่ได้</div>
        <Button variant="teal" size="sm" className="mt-3.5" onClick={onDownload}>
          <Icons.Download className="h-3.5 w-3.5" />
          ดาวน์โหลดเพื่อเปิด
        </Button>
      </div>
    </div>
  );
}
