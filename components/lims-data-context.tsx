"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type Document,
  type Equipment,
  type InventoryItem,
  type Notification,
  type Sample,
  type TagTone,
  type TestResult,
} from "@/lib/data";
import { apiFetch, apiUpload } from "@/lib/api-client";
import { moveWithinBox as moveWithinBoxApi, type CellMove } from "@/lib/locations-api";
import { listSamplesInBox } from "@/lib/samples-api";
import { issueStock as issueStockApi, type IssueLine, type IssueResult } from "@/lib/inventory-api";
import {
  createEquipment,
  patchEquipment as patchEquipmentApi,
  type EquipmentInput,
  type EquipmentPatch,
} from "@/lib/equipment-api";
import { createItem as createItemApi, updateItem as updateItemApi, type ItemInput } from "@/lib/inventory-api";
import { useAuth } from "@/lib/auth-context";
import {
  mapDocument,
  mapEquipment,
  mapInventory,
  mapNotification,
  mapSample,
  mapTestResult,
  type DocumentDTO,
  type EquipmentDTO,
  type InventoryDTO,
  type NotificationDTO,
  type SampleDTO,
  type TestResultDTO,
  type UserDTO,
} from "@/lib/backend-mappers";

export type ModalKey =
  | "add-sample"
  | "scan-barcode"
  | "add-equipment"
  | "export-audit-report"
  | "add-sensor"
  | "alert-thresholds"
  | "add-inventory"
  | "order-history"
  | "upload-document"
  | "manage-access"
  | "open-test-order"
  | "generate-report"
  | "record-calibration";

interface Toast {
  id: string;
  tone: TagTone;
  message: string;
}

export interface LimsUser {
  id: number;
  name: string;
}

interface LimsContextValue {
  samples: Sample[];
  users: LimsUser[];
  equipment: Equipment[];
  inventory: InventoryItem[];
  documents: Document[];
  tests: TestResult[];
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addSample: (s: {
    name: string;
    type: string;
    custodianUserId: number;
    description?: string;
    barcodeId?: string;
  }) => Promise<Sample>;
  genSampleBarcode: (sampleId: string) => Promise<Sample>;
  /** `position` is required when `locationId` is a Box, rejected otherwise (ADR-0009). */
  putAwaySample: (sampleId: string, locationId: string, position?: string) => Promise<void>;
  /** Atomic Cell rearrangement within one Box; refreshes the affected samples. */
  moveWithinBox: (boxId: string, moves: CellMove[]) => Promise<void>;
  addEquipment: (input: EquipmentInput) => Promise<Equipment>;
  patchEquipmentFields: (id: string, patch: EquipmentPatch) => Promise<Equipment>;
  addInventoryItem: (input: ItemInput) => Promise<InventoryItem>;
  patchInventoryItem: (id: string, input: ItemInput) => Promise<InventoryItem>;
  applyReceivedItem: (item: InventoryItem) => void;
  issueStock: (itemId: string, lines: IssueLine[], force: boolean) => Promise<IssueResult>;
  addDocument: (
    d: { name: string; type: string; access: string; equipmentId?: string; calibrationEventId?: number },
    file: File | null
  ) => Promise<Document>;
  addTest: (t: { sample: string; test: string; analyst: string; ref: string }) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  toasts: Toast[];
  pushToast: (message: string, tone?: TagTone) => void;
  dismissToast: (id: string) => void;
  activeModal: ModalKey | null;
  modalContext: ModalContext;
  openModal: (key: ModalKey, context?: ModalContext) => void;
  closeModal: () => void;
}

/** Optional payload a caller can attach when opening a modal (e.g. preset the upload-document form). */
export interface ModalContext {
  /** upload-document: link the file to this equipment and preset type=warranty, hiding the type/access pickers. */
  equipmentId?: string;
  calibrationEventId?: number;
  inventoryItemId?: string;
  docType?: string;
  docTypeLabel?: string;
}

const LimsContext = createContext<LimsContextValue | null>(null);

export function LimsDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [users, setUsers] = useState<LimsUser[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const [modalContext, setModalContext] = useState<ModalContext>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const pushToast = useCallback(
    (message: string, tone: TagTone = "teal") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => dismissToast(id), 3500);
    },
    [dismissToast]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      apiFetch<UserDTO[]>("/users"),
      apiFetch<SampleDTO[]>("/samples"),
      apiFetch<EquipmentDTO[]>("/equipment").then((r) => r.map(mapEquipment)),
      apiFetch<InventoryDTO[]>("/inventory").then((r) => r.map(mapInventory)),
      apiFetch<DocumentDTO[]>("/documents").then((r) => r.map(mapDocument)),
      apiFetch<TestResultDTO[]>("/tests").then((r) => r.map(mapTestResult)),
      apiFetch<NotificationDTO[]>("/notifications").then((r) => r.map(mapNotification)),
    ]).then(([u, s, e, i, d, t, n]) => {
      if (cancelled) return;
      const userList = u.status === "fulfilled" ? u.value : [];
      const nameById = new Map(userList.map((x) => [x.id, x.name]));
      if (u.status === "fulfilled") setUsers(userList.map((x) => ({ id: x.id, name: x.name })));
      if (s.status === "fulfilled") setSamples(s.value.map((x) => mapSample(x, nameById)));
      if (e.status === "fulfilled") setEquipment(e.value);
      if (i.status === "fulfilled") setInventory(i.value);
      if (d.status === "fulfilled") setDocuments(d.value);
      if (t.status === "fulfilled") setTests(t.value);
      if (n.status === "fulfilled") setNotifications(n.value);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const addSample = useCallback(
    async (s: { name: string; type: string; custodianUserId: number; description?: string; barcodeId?: string }) => {
      const barcode = s.barcodeId?.trim();
      const created = await apiFetch<SampleDTO>("/samples", {
        method: "POST",
        body: JSON.stringify({
          name: s.name,
          type: s.type.toLowerCase(),
          custodian_user_id: s.custodianUserId,
          description: s.description?.trim() ?? "",
          ...(barcode ? { barcode_id: barcode } : {}),
        }),
      });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      const mapped = mapSample(created, nameById);
      setSamples((prev) => [mapped, ...prev]);
      return mapped;
    },
    [users]
  );

  const genSampleBarcode = useCallback(
    async (sampleId: string) => {
      const dto = await apiFetch<SampleDTO>(`/samples/${sampleId}/barcode`, { method: "POST" });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      const mapped = mapSample(dto, nameById);
      setSamples((prev) => prev.map((x) => (x.id === sampleId ? mapped : x)));
      return mapped;
    },
    [users]
  );

  const putAwaySample = useCallback(
    async (sampleId: string, locationId: string, position?: string) => {
      const updated = await apiFetch<SampleDTO>(`/samples/${sampleId}/location`, {
        method: "PATCH",
        body: JSON.stringify({ location_id: locationId, ...(position ? { position } : {}) }),
      });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      setSamples((prev) => prev.map((s) => (s.id === sampleId ? mapSample(updated, nameById) : s)));
    },
    [users]
  );

  const moveWithinBox = useCallback(
    async (boxId: string, moves: CellMove[]) => {
      await moveWithinBoxApi(boxId, moves);
      // The batch may have shuffled samples not in `moves` too (none here, but
      // cheap insurance) — re-pull the whole box and merge.
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      const fresh = await listSamplesInBox(boxId, nameById);
      const byId = new Map(fresh.map((s) => [s.id, s]));
      setSamples((prev) => prev.map((s) => byId.get(s.id) ?? s));
    },
    [users]
  );

  const addEquipment = useCallback(async (input: EquipmentInput) => {
    const created = await createEquipment(input);
    setEquipment((prev) => [created, ...prev]);
    return created;
  }, []);

  const patchEquipmentFields = useCallback(async (id: string, patch: EquipmentPatch) => {
    const updated = await patchEquipmentApi(id, patch);
    setEquipment((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const addInventoryItem = useCallback(async (input: ItemInput) => {
    const created = await createItemApi(input);
    setInventory((prev) => [created, ...prev]);
    return created;
  }, []);

  const patchInventoryItem = useCallback(async (id: string, input: ItemInput) => {
    const updated = await updateItemApi(id, input);
    setInventory((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  }, []);

  /** Called by the receive page so the list's derived qty / expiry stay fresh. */
  const applyReceivedItem = useCallback((item: InventoryItem) => {
    setInventory((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  }, []);

  const issueStock = useCallback(async (itemId: string, lines: IssueLine[], force: boolean) => {
    const result = await issueStockApi(itemId, lines, force);
    if (result.applied) {
      setInventory((prev) => prev.map((i) => (i.id === itemId ? mapInventory(result.item) : i)));
    }
    return result;
  }, []);

  const addDocument = useCallback(
    async (
      d: { name: string; type: string; access: string; equipmentId?: string; calibrationEventId?: number },
      file: File | null
    ) => {
      if (!file) throw new Error("กรุณาเลือกไฟล์เอกสาร");
      const form = new FormData();
      form.append("file", file);
      form.append("name", d.name);
      form.append("type", d.type);
      form.append("access_level", d.access);
      if (d.equipmentId) form.append("equipment_id", d.equipmentId);
      if (d.calibrationEventId) form.append("calibration_event_id", String(d.calibrationEventId));
      const created = mapDocument(await apiUpload<DocumentDTO>("/documents", form));
      setDocuments((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const addTest = useCallback(async (t: { sample: string; test: string; analyst: string; ref: string }) => {
    const created = await apiFetch<TestResultDTO>("/tests", {
      method: "POST",
      body: JSON.stringify({ sample_id: t.sample, test_name: t.test, analyst: t.analyst, ref_range: t.ref }),
    });
    setTests((prev) => [mapTestResult(created), ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    apiFetch(`/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    apiFetch("/notifications/read-all", { method: "PATCH" }).catch(() => {});
  }, []);

  const openModal = useCallback((key: ModalKey, context: ModalContext = {}) => {
    setModalContext(context);
    setActiveModal(key);
  }, []);
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalContext({});
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo<LimsContextValue>(
    () => ({
      samples,
      users,
      equipment,
      inventory,
      documents,
      tests,
      notifications,
      unreadCount,
      loading,
      addSample,
      genSampleBarcode,
      putAwaySample,
      moveWithinBox,
      addEquipment,
      patchEquipmentFields,
      addInventoryItem,
      patchInventoryItem,
      applyReceivedItem,
      issueStock,
      addDocument,
      addTest,
      markNotificationRead,
      markAllRead,
      toasts,
      pushToast,
      dismissToast,
      activeModal,
      modalContext,
      openModal,
      closeModal,
    }),
    [
      samples,
      users,
      equipment,
      inventory,
      documents,
      tests,
      notifications,
      unreadCount,
      loading,
      addSample,
      genSampleBarcode,
      putAwaySample,
      moveWithinBox,
      addEquipment,
      patchEquipmentFields,
      addInventoryItem,
      patchInventoryItem,
      applyReceivedItem,
      issueStock,
      addDocument,
      addTest,
      markNotificationRead,
      markAllRead,
      toasts,
      pushToast,
      dismissToast,
      activeModal,
      modalContext,
      openModal,
      closeModal,
    ]
  );

  return <LimsContext.Provider value={value}>{children}</LimsContext.Provider>;
}

export function useLims() {
  const ctx = useContext(LimsContext);
  if (!ctx) throw new Error("useLims must be used within LimsDataProvider");
  return ctx;
}
