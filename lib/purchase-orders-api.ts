import { apiFetch } from "@/lib/api-client";
import { mapPurchaseOrder, type PurchaseOrderDTO } from "@/lib/backend-mappers";
import type { PurchaseOrder } from "@/lib/data";

/** Flat list of every purchase order, newest-first as the backend returns it. */
export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = await apiFetch<PurchaseOrderDTO[]>("/purchase-orders");
  return rows.map(mapPurchaseOrder);
}
