"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  DOCUMENTS,
  EQUIPMENT,
  INVENTORY,
  NOTIFICATIONS,
  SAMPLES,
  TESTS,
  type Document,
  type Equipment,
  type InventoryItem,
  type Notification,
  type Sample,
  type TagTone,
  type TestResult,
} from "@/lib/data";

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
  addSample: (s: Sample) => void;
  addEquipment: (e: Equipment) => void;
  addInventoryItem: (i: InventoryItem) => void;
  addDocument: (d: Document) => void;
  addTest: (t: TestResult) => void;
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
  const [samples, setSamples] = useState<Sample[]>(SAMPLES);
  const [equipment, setEquipment] = useState<Equipment[]>(EQUIPMENT);
  const [inventory, setInventory] = useState<InventoryItem[]>(INVENTORY);
  const [documents, setDocuments] = useState<Document[]>(DOCUMENTS);
  const [tests, setTests] = useState<TestResult[]>(TESTS);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);

  const addSample = useCallback((s: Sample) => setSamples((prev) => [s, ...prev]), []);
  const addEquipment = useCallback((e: Equipment) => setEquipment((prev) => [e, ...prev]), []);
  const addInventoryItem = useCallback((i: InventoryItem) => setInventory((prev) => [i, ...prev]), []);
  const addDocument = useCallback((d: Document) => setDocuments((prev) => [d, ...prev]), []);
  const addTest = useCallback((t: TestResult) => setTests((prev) => [t, ...prev]), []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

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
