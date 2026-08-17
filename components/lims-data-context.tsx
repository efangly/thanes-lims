"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
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
  | "generate-report";

interface Toast {
  id: string;
  tone: TagTone;
  message: string;
}

interface LimsContextValue {
  samples: Sample[];
  equipment: Equipment[];
  inventory: InventoryItem[];
  documents: Document[];
  tests: TestResult[];
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addSample: (s: Pick<Sample, "name" | "type" | "custodian" | "loc">) => Promise<void>;
  addEquipment: (e: Pick<Equipment, "name" | "next">) => Promise<void>;
  addInventoryItem: (i: Pick<InventoryItem, "name" | "cat" | "qty" | "unit" | "min" | "max">) => Promise<void>;
  addDocument: (d: Pick<Document, "name" | "type" | "access">, file: File | null) => Promise<void>;
  addTest: (t: { sample: string; test: string; analyst: string; ref: string }) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  toasts: Toast[];
  pushToast: (message: string, tone?: TagTone) => void;
  dismissToast: (id: string) => void;
  activeModal: ModalKey | null;
  openModal: (key: ModalKey) => void;
  closeModal: () => void;
}

const LimsContext = createContext<LimsContextValue | null>(null);

export function LimsDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);

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
      apiFetch<SampleDTO[]>("/samples").then((r) => r.map(mapSample)),
      apiFetch<EquipmentDTO[]>("/equipment").then((r) => r.map(mapEquipment)),
      apiFetch<InventoryDTO[]>("/inventory").then((r) => r.map(mapInventory)),
      apiFetch<DocumentDTO[]>("/documents").then((r) => r.map(mapDocument)),
      apiFetch<TestResultDTO[]>("/tests").then((r) => r.map(mapTestResult)),
      apiFetch<NotificationDTO[]>("/notifications").then((r) => r.map(mapNotification)),
    ]).then(([s, e, i, d, t, n]) => {
      if (cancelled) return;
      if (s.status === "fulfilled") setSamples(s.value);
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

  const addSample = useCallback(async (s: Pick<Sample, "name" | "type" | "custodian" | "loc">) => {
    const created = await apiFetch<SampleDTO>("/samples", {
      method: "POST",
      body: JSON.stringify({ name: s.name, type: s.type.toLowerCase(), custodian: s.custodian, location: s.loc }),
    });
    setSamples((prev) => [mapSample(created), ...prev]);
  }, []);

  const addEquipment = useCallback(async (e: Pick<Equipment, "name" | "next">) => {
    const typeCode =
      e.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 20) || "EQUIPMENT";
    const created = await apiFetch<EquipmentDTO>("/equipment", {
      method: "POST",
      body: JSON.stringify({ name: e.name, type_code: typeCode, next_calibration_due: new Date(e.next).toISOString() }),
    });
    setEquipment((prev) => [mapEquipment(created), ...prev]);
  }, []);

  const addInventoryItem = useCallback(
    async (i: Pick<InventoryItem, "name" | "cat" | "qty" | "unit" | "min" | "max">) => {
      const created = await apiFetch<InventoryDTO>("/inventory", {
        method: "POST",
        body: JSON.stringify({ name: i.name, category: i.cat, quantity: i.qty, unit: i.unit, min: i.min, max: i.max }),
      });
      setInventory((prev) => [mapInventory(created), ...prev]);
    },
    []
  );

  const addDocument = useCallback(async (d: Pick<Document, "name" | "type" | "access">, file: File | null) => {
    if (!file) throw new Error("กรุณาเลือกไฟล์เอกสาร");
    const form = new FormData();
    form.append("file", file);
    form.append("name", d.name);
    form.append("type", d.type);
    form.append("access_level", d.access);
    const created = await apiUpload<DocumentDTO>("/documents", form);
    setDocuments((prev) => [mapDocument(created), ...prev]);
  }, []);

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

  const openModal = useCallback((key: ModalKey) => setActiveModal(key), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <LimsContext.Provider
      value={{
        samples,
        equipment,
        inventory,
        documents,
        tests,
        notifications,
        unreadCount,
        loading,
        addSample,
        addEquipment,
        addInventoryItem,
        addDocument,
        addTest,
        markNotificationRead,
        markAllRead,
        toasts,
        pushToast,
        dismissToast,
        activeModal,
        openModal,
        closeModal,
      }}
    >
      {children}
    </LimsContext.Provider>
  );
}

export function useLims() {
  const ctx = useContext(LimsContext);
  if (!ctx) throw new Error("useLims must be used within LimsDataProvider");
  return ctx;
}
