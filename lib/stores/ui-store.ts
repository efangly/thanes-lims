import { create } from "zustand";
import type { PartnerDevice, TagTone } from "@/lib/data";

export type ModalKey =
  | "add-sample"
  | "scan-barcode"
  | "add-equipment"
  | "export-audit-report"
  | "add-partner-device"
  | "edit-partner-device"
  | "add-inventory"
  | "order-history"
  | "upload-document"
  | "manage-access"
  | "open-test-order"
  | "generate-report"
  | "record-calibration"
  | "record-maintenance"
  | "submit-test-result"
  | "print-samples";

export interface Toast {
  id: string;
  tone: TagTone;
  message: string;
}

/** Optional payload a caller can attach when opening a modal (e.g. preset the upload-document form). */
export interface ModalContext {
  /** upload-document: link the file to this equipment and preset type=warranty, hiding the type/access pickers. */
  equipmentId?: string;
  calibrationEventId?: number;
  inventoryItemId?: string;
  docType?: string;
  docTypeLabel?: string;
  /** submit-test-result: which TestResult the form is for. */
  testResultId?: string;
  /** add/edit-partner-device: Gauge Locations the Location select can offer (must be an existing Gauge - never auto-created). */
  gaugeLocations?: string[];
  /** add-partner-device: called after a successful create so the Environment page's list/snapshot panel refreshes without a full reload. */
  onPartnerDeviceCreated?: () => void;
  /** edit-partner-device: the mapping being edited, pre-fills the form. */
  editingPartnerDevice?: PartnerDevice;
  /** edit-partner-device: called after a successful update so the Environment page's list/snapshot panel refreshes without a full reload. */
  onPartnerDeviceUpdated?: () => void;
  /** record-maintenance: called after a Maintenance Event is saved so the equipment page can refetch schedules / history. */
  onMaintenanceRecorded?: () => void;
  /** print-samples: the sample ids whose stickers should be printed together. */
  sampleIds?: string[];
  /** print-samples: called after a successful print so the caller can clear its selection. */
  onPrinted?: () => void;
}

interface UiState {
  toasts: Toast[];
  activeModal: ModalKey | null;
  modalContext: ModalContext;
  pushToast: (message: string, tone?: TagTone) => void;
  dismissToast: (id: string) => void;
  openModal: (key: ModalKey, context?: ModalContext) => void;
  closeModal: () => void;
}

/** client/UI state (modal + toast) — ไม่เกี่ยวกับข้อมูลจาก backend (อันนั้นอยู่ใน TanStack Query) */
export const useUiStore = create<UiState>((set, get) => ({
  toasts: [],
  activeModal: null,
  modalContext: {},
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pushToast: (message, tone = "teal") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    setTimeout(() => get().dismissToast(id), 3500);
  },
  openModal: (key, context = {}) => set({ modalContext: context, activeModal: key }),
  closeModal: () => set({ activeModal: null, modalContext: {} }),
}));
