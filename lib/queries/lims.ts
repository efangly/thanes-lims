import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api-client";
import {
  mapDocument,
  mapEquipment,
  mapInventory,
  mapNotification,
  mapSample,
  mapTestResult,
} from "@/lib/backend-mappers";
import {
  documentSchema,
  equipmentSchema,
  equipmentSummarySchema,
  inventorySchema,
  notificationSchema,
  sampleSchema,
  testResultSchema,
  userSchema,
} from "@/lib/schemas";
import { limsKeys } from "./keys";

export interface LimsUser {
  id: number;
  name: string;
}

export const usersQuery = () =>
  queryOptions({
    queryKey: limsKeys.users,
    queryFn: async (): Promise<LimsUser[]> =>
      (await apiFetch("/users", { schema: z.array(userSchema) })).map((u) => ({ id: u.id, name: u.name })),
  });

/** ชื่อผู้ดูแลของ sample มาจาก /users — ดึงผ่าน cache เดียวกัน (dedupe กับ usersQuery) */
export const samplesQuery = (qc: QueryClient) =>
  queryOptions({
    queryKey: limsKeys.samples,
    queryFn: async () => {
      const [rows, users] = await Promise.all([
        apiFetch("/samples", { schema: z.array(sampleSchema) }),
        qc.ensureQueryData(usersQuery()).catch(() => [] as LimsUser[]),
      ]);
      const nameById = new Map(users.map((u) => [u.id, u.name]));
      return rows.map((r) => mapSample(r, nameById));
    },
  });

export const equipmentQuery = () =>
  queryOptions({
    queryKey: limsKeys.equipment,
    queryFn: async () => (await apiFetch("/equipment", { schema: z.array(equipmentSchema) })).map(mapEquipment),
  });

/** Dashboard equipment counts (overall / calibration / maintenance) in one request. */
export const equipmentSummaryQuery = () =>
  queryOptions({
    queryKey: limsKeys.equipmentSummary,
    queryFn: () => apiFetch("/equipment/summary", { schema: equipmentSummarySchema }),
  });

export const inventoryQuery = () =>
  queryOptions({
    queryKey: limsKeys.inventory,
    queryFn: async () => (await apiFetch("/inventory", { schema: z.array(inventorySchema) })).map(mapInventory),
  });

export const documentsQuery = () =>
  queryOptions({
    queryKey: limsKeys.documents,
    queryFn: async () => (await apiFetch("/documents", { schema: z.array(documentSchema) })).map(mapDocument),
  });

export const testsQuery = () =>
  queryOptions({
    queryKey: limsKeys.tests,
    queryFn: async () => (await apiFetch("/tests", { schema: z.array(testResultSchema) })).map(mapTestResult),
  });

export const notificationsQuery = () =>
  queryOptions({
    queryKey: limsKeys.notifications,
    queryFn: async () =>
      (await apiFetch("/notifications", { schema: z.array(notificationSchema) })).map(mapNotification),
  });
