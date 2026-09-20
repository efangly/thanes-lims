"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Document,
  type Equipment,
  type InventoryItem,
  type Notification,
  type PartnerDevice,
  type Sample,
  type TagTone,
  type TestResult,
} from "@/lib/data";
import { apiFetch, apiUpload } from "@/lib/api-client";
import { moveWithinBox as moveWithinBoxApi, type CellMove } from "@/lib/locations-api";
import { listSamplesInBox, updateSampleStatus as updateSampleStatusApi } from "@/lib/samples-api";
import { approveTestResult as approveTestResultApi, submitTestResult as submitTestResultApi } from "@/lib/tests-api";
import { issueStock as issueStockApi, type IssueLine, type IssueResult } from "@/lib/inventory-api";
import {
  createEquipment,
  patchEquipment as patchEquipmentApi,
  type EquipmentInput,
  type EquipmentPatch,
} from "@/lib/equipment-api";
import { createItem as createItemApi, updateItem as updateItemApi, type ItemInput } from "@/lib/inventory-api";
import { useAuth } from "@/lib/auth-context";
import { limsKeys } from "@/lib/queries/keys";
import {
  documentsQuery,
  equipmentQuery,
  inventoryQuery,
  notificationsQuery,
  samplesQuery,
  testsQuery,
  usersQuery,
  type LimsUser,
} from "@/lib/queries/lims";
import {
  mapDocument,
  mapInventory,
  mapSample,
  mapTestResult,
  type DocumentDTO,
  type SampleDTO,
  type TestResultDTO,
} from "@/lib/backend-mappers";

export type { LimsUser };
export type { ModalKey, ModalContext } from "@/lib/stores/ui-store";

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
  /** Changes a sample's status; rejects with the backend's 400 message on an invalid lifecycle transition. */
  updateSampleStatus: (sampleId: string, status: string) => Promise<Sample>;
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
  /** `analyzing` → `pending_verification`; rejects with the backend's 400 message from any other status. */
  submitTestResult: (id: string, result: string, flag: TestResult["flag"]) => Promise<TestResult>;
  /** `pending_verification` → `approved`, Admin/QA only; rejects with the backend's 403/400 message otherwise. */
  approveTest: (id: string) => Promise<TestResult>;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
}

const EMPTY_USERS: LimsUser[] = [];
const EMPTY_SAMPLES: Sample[] = [];
const EMPTY_EQUIPMENT: Equipment[] = [];
const EMPTY_INVENTORY: InventoryItem[] = [];
const EMPTY_DOCUMENTS: Document[] = [];
const EMPTY_TESTS: TestResult[] = [];
const EMPTY_NOTIFICATIONS: Notification[] = [];

const LimsContext = createContext<LimsContextValue | null>(null);

export function LimsDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const enabled = !!user;

  // server state = TanStack Query (cache กลาง; mutation เขียนกลับเข้า cache ด้วย setQueryData)
  const usersQ = useQuery({ ...usersQuery(), enabled });
  const samplesQ = useQuery({ ...samplesQuery(qc), enabled });
  const equipmentQ = useQuery({ ...equipmentQuery(), enabled });
  const inventoryQ = useQuery({ ...inventoryQuery(), enabled });
  const documentsQ = useQuery({ ...documentsQuery(), enabled });
  const testsQ = useQuery({ ...testsQuery(), enabled });
  const notificationsQ = useQuery({ ...notificationsQuery(), enabled });

  const users = usersQ.data ?? EMPTY_USERS;
  const samples = samplesQ.data ?? EMPTY_SAMPLES;
  const equipment = equipmentQ.data ?? EMPTY_EQUIPMENT;
  const inventory = inventoryQ.data ?? EMPTY_INVENTORY;
  const documents = documentsQ.data ?? EMPTY_DOCUMENTS;
  const tests = testsQ.data ?? EMPTY_TESTS;
  const notifications = notificationsQ.data ?? EMPTY_NOTIFICATIONS;
  // เดิม loading = ยังไม่ครบทั้ง 7 (ล้มเหลวก็นับว่าจบ) — isPending เป็น false เมื่อสำเร็จหรือ error
  const loading = [usersQ, samplesQ, equipmentQ, inventoryQ, documentsQ, testsQ, notificationsQ].some((q) => q.isPending);

  const setSamples = useCallback(
    (fn: (prev: Sample[]) => Sample[]) => qc.setQueryData<Sample[]>(limsKeys.samples, (p) => fn(p ?? [])),
    [qc]
  );
  const setEquipment = useCallback(
    (fn: (prev: Equipment[]) => Equipment[]) => qc.setQueryData<Equipment[]>(limsKeys.equipment, (p) => fn(p ?? [])),
    [qc]
  );
  const setInventory = useCallback(
    (fn: (prev: InventoryItem[]) => InventoryItem[]) =>
      qc.setQueryData<InventoryItem[]>(limsKeys.inventory, (p) => fn(p ?? [])),
    [qc]
  );
  const setDocuments = useCallback(
    (fn: (prev: Document[]) => Document[]) => qc.setQueryData<Document[]>(limsKeys.documents, (p) => fn(p ?? [])),
    [qc]
  );
  const setTests = useCallback(
    (fn: (prev: TestResult[]) => TestResult[]) => qc.setQueryData<TestResult[]>(limsKeys.tests, (p) => fn(p ?? [])),
    [qc]
  );
  const setNotifications = useCallback(
    (fn: (prev: Notification[]) => Notification[]) =>
      qc.setQueryData<Notification[]>(limsKeys.notifications, (p) => fn(p ?? [])),
    [qc]
  );

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

  const updateSampleStatus = useCallback(
    async (sampleId: string, status: string) => {
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      const updated = await updateSampleStatusApi(sampleId, status, nameById);
      setSamples((prev) => prev.map((s) => (s.id === sampleId ? updated : s)));
      return updated;
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

  const submitTestResult = useCallback(async (id: string, result: string, flag: TestResult["flag"]) => {
    const updated = await submitTestResultApi(id, result, flag);
    setTests((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const approveTest = useCallback(async (id: string) => {
    const updated = await approveTestResultApi(id);
    setTests((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    apiFetch(`/notifications/${id}/read`, { method: "PATCH" }).catch(() =>
      qc.invalidateQueries({ queryKey: limsKeys.notifications })
    );
  }, [qc, setNotifications]);
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    apiFetch("/notifications/read-all", { method: "PATCH" }).catch(() =>
      qc.invalidateQueries({ queryKey: limsKeys.notifications })
    );
  }, [qc, setNotifications]);

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
      updateSampleStatus,
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
      submitTestResult,
      approveTest,
      markNotificationRead,
      markAllRead,
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
      updateSampleStatus,
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
      submitTestResult,
      approveTest,
      markNotificationRead,
      markAllRead,
    ]
  );

  return <LimsContext.Provider value={value}>{children}</LimsContext.Provider>;
}

export function useLims() {
  const ctx = useContext(LimsContext);
  if (!ctx) throw new Error("useLims must be used within LimsDataProvider");
  return ctx;
}
