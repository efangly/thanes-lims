import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import { mapSample, type SampleDTO } from "@/lib/backend-mappers";
import type { Sample } from "@/lib/data";

/**
 * Server-side sample search. The registry filter bar maps straight onto the
 * backend's `GET /samples` query params — barcode is an exact match (what a
 * physical scan resolves to), location is an ILIKE on the leaf Location name,
 * custodian is the User id.
 */
export interface SampleFilter {
  barcodeId?: string;
  location?: string;
  custodianUserId?: string;
}

export function hasSampleFilter(f: SampleFilter): boolean {
  return Boolean(f.barcodeId?.trim() || f.location?.trim() || f.custodianUserId);
}

export async function searchSamples(f: SampleFilter, nameById: Map<number, string>): Promise<Sample[]> {
  const qs = new URLSearchParams();
  if (f.barcodeId?.trim()) qs.set("barcode_id", f.barcodeId.trim());
  if (f.location?.trim()) qs.set("location", f.location.trim());
  if (f.custodianUserId) qs.set("custodian_user_id", f.custodianUserId);
  const rows = await apiFetch<SampleDTO[]>(`/samples?${qs.toString()}`);
  return rows.map((r) => mapSample(r, nameById));
}

/** Every active/assigned sample currently sitting in `boxId`, for rendering its Cell grid (ADR-0009). */
export async function listSamplesInBox(boxId: string, nameById: Map<number, string>): Promise<Sample[]> {
  const rows = await apiFetch<SampleDTO[]>(`/samples?location_id=${encodeURIComponent(boxId)}`);
  return rows.map((r) => mapSample(r, nameById));
}

/**
 * Assigns an auto-generated Barcode ID (SMP-BC-xxxxx) to a sample that has none.
 * Idempotent per sample — the backend returns the existing code unchanged if one
 * is already set. The frontend never generates the number itself: it is a
 * separate sequence from the Sample ID and would collide.
 */
export async function generateSampleBarcode(sampleId: string, nameById: Map<number, string>): Promise<Sample> {
  const dto = await apiFetch<SampleDTO>(`/samples/${sampleId}/barcode`, { method: "POST" });
  return mapSample(dto, nameById);
}

/* ---------- Sticker printing ---------- */

export const STICKER_TEMPLATES = [
  { value: "cap", label: "ฝาหลอด (9.5 × 6.4 mm)" },
  { value: "stem", label: "ก้านหลอด (20.5 × 6.5 mm)" },
  { value: "small", label: "เล็ก (40 × 20 mm)" },
  { value: "medium", label: "กลาง (60 × 30 mm)" },
] as const;

export const STICKER_SYMBOLOGIES = [
  { value: "code128", label: "บาร์โค้ด 1 มิติ (Code 128)" },
  { value: "qr", label: "QR Code" },
] as const;

export interface StickerPrefs {
  template: string;
  symbology: string;
}

const PREFS_KEY = "lims.sticker.prefs";

export function loadStickerPrefs(): StickerPrefs {
  const fallback: StickerPrefs = { template: "medium", symbology: "code128" };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StickerPrefs>;
    return {
      template: STICKER_TEMPLATES.some((t) => t.value === parsed.template) ? parsed.template! : fallback.template,
      symbology: STICKER_SYMBOLOGIES.some((s) => s.value === parsed.symbology) ? parsed.symbology! : fallback.symbology,
    };
  } catch {
    return fallback;
  }
}

export function saveStickerPrefs(prefs: StickerPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / disabled storage — the print still works, just no remembered default */
  }
}

/**
 * Opens the sticker PDF in a new tab for the operator to print themselves. We do
 * NOT call window.print() — the browser dialog would default to A4 with one tiny
 * label in a corner; the operator needs to pick the label paper size.
 *
 * The tab is opened synchronously (before the await) so it is not treated as a
 * popup, then pointed at the blob once it arrives.
 */
export async function openStickerInNewTab(sampleId: string, prefs: StickerPrefs): Promise<void> {
  const tab = window.open("", "_blank");
  try {
    const qs = new URLSearchParams({ template: prefs.template, symbology: prefs.symbology });
    const blob = await apiFetchBlob(`/samples/${sampleId}/sticker?${qs.toString()}`);
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      // popup blocked — fall back to a same-tab navigation
      window.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
