import { apiFetch } from "@/lib/api-client";

const DOC_TYPE_LABEL: Record<string, string> = {
  sop: "SOP",
  manual: "คู่มือ",
  policy: "นโยบาย",
  form: "แบบฟอร์ม",
  record: "บันทึก",
  warranty: "บัตรรับประกัน",
  certificate: "ใบรับรอง",
};

/** Human label for a canonical (lowercase) `document.Type`; unknown → as-is. */
export function docTypeLabel(type: string): string {
  return DOC_TYPE_LABEL[type.toLowerCase()] ?? type;
}

/**
 * Asks the backend for a short-lived (≈15 min) presigned URL pointing straight
 * at the document's file in object storage. Used for the "download" /
 * "open in new tab" actions. The URL expires, so it is re-fetched on demand and
 * never cached.
 */
export async function getDocumentDownloadUrl(docId: string): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`/documents/${docId}/download`);
  return url;
}

/**
 * A same-origin `blob:` URL for the document's file, for the inline Preview
 * iframe (ADR-0013). We deliberately do NOT point the iframe straight at the
 * presigned object-storage URL: a cross-origin PDF frame gets stripped by
 * Chrome's cross-origin PDF handling, so we fetch the bytes and wrap them in a
 * blob URL (same pattern as the sticker PDF in `samples-api.ts`). Caller must
 * `URL.revokeObjectURL` the result when done.
 */
export async function getDocumentPreviewObjectUrl(docId: string): Promise<string> {
  const src = await getDocumentDownloadUrl(docId);
  const blob = await fetch(src).then((r) => {
    if (!r.ok) throw new Error(`preview fetch failed (${r.status})`);
    return r.blob();
  });
  return URL.createObjectURL(blob);
}

const PREVIEWABLE_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "txt",
  "md",
  "csv",
]);

/**
 * Whether the browser can render this file kind on its own inside an iframe.
 * Decided from the filename extension (ADR-0013). Unknown / missing extension →
 * not previewable.
 */
export function isPreviewable(fileName: string): boolean {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return false;
  return PREVIEWABLE_EXTENSIONS.has(fileName.slice(dot + 1).toLowerCase());
}
