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
import { issueStock as issueStockApi, type IssueLine, type IssueResult } from "@/lib/inventory-api";
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
  | "generate-report";

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
  addSample: (s: { name: string; type: string; custodianUserId: number }) => Promise<void>;
  putAwaySample: (sampleId: string, locationId: string) => Promise<void>;
  addEquipment: (e: Pick<Equipment, "name" | "next">) => Promise<void>;
  addInventoryItem: (i: Pick<InventoryItem, "name" | "cat" | "qty" | "unit" | "min" | "max">) => Promise<void>;
  issueStock: (itemId: string, lines: IssueLine[], force: boolean) => Promise<IssueResult>;
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
  const [users, setUsers] = useState<LimsUser[]>([]);
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
    async (s: { name: string; type: string; custodianUserId: number }) => {
      const created = await apiFetch<SampleDTO>("/samples", {
        method: "POST",
        body: JSON.stringify({
          name: s.name,
          type: s.type.toLowerCase(),
          custodian_user_id: s.custodianUserId,
        }),
      });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      setSamples((prev) => [mapSample(created, nameById), ...prev]);
    },
    [users]
  );

  const putAwaySample = useCallback(
    async (sampleId: string, locationId: string) => {
      const updated = await apiFetch<SampleDTO>(`/samples/${sampleId}/location`, {
        method: "PATCH",
        body: JSON.stringify({ location_id: locationId }),
      });
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      setSamples((prev) => prev.map((s) => (s.id === sampleId ? mapSample(updated, nameById) : s)));
    },
    [users]
  );

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

  const issueStock = useCallback(async (itemId: string, lines: IssueLine[], force: boolean) => {
    const result = await issueStockApi(itemId, lines, force);
    if (result.applied) {
      setInventory((prev) => prev.map((i) => (i.id === itemId ? mapInventory(result.item) : i)));
    }
    return result;
  }, []);

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
      putAwaySample,
      addEquipment,
      addInventoryItem,
      issueStock,
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
      putAwaySample,
      addEquipment,
      addInventoryItem,
      issueStock,
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
    ]
  );

  return <LimsContext.Provider value={value}>{children}</LimsContext.Provider>;
}

export function useLims() {
  const ctx = useContext(LimsContext);
  if (!ctx) throw new Error("useLims must be used within LimsDataProvider");
  return ctx;
}
