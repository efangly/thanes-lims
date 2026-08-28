import { apiFetch } from "@/lib/api-client";
import type { InventoryItem, InventoryLot } from "@/lib/data";
import { mapInventory, mapInventoryLot, type InventoryDTO, type InventoryLotDTO } from "@/lib/backend-mappers";

/** Lots of an item, backend-sorted by expiry (nulls last) then lot_no. */
export async function listLots(itemId: string): Promise<InventoryLot[]> {
  const rows = await apiFetch<InventoryLotDTO[]>(`/inventory/${itemId}/lots`);
  return rows.map(mapInventoryLot);
}

/**
 * Item master fields (Phase 7′). No `quantity` — stock only enters through a lot
 * (POST /inventory/{id}/receive). `custodianUserId` is required by the backend.
 */
export interface ItemInput {
  name: string;
  category: string;
  unit: string;
  min: number;
  max: number;
  custodianUserId: number;
  manufacturer: string;
  vendorId: string | null;
  locationId: string | null;
}

function toItemBody(i: ItemInput) {
  return JSON.stringify({
    name: i.name,
    category: i.category,
    unit: i.unit,
    min: i.min,
    max: i.max,
    custodian_user_id: i.custodianUserId,
    manufacturer: i.manufacturer,
    vendor_id: i.vendorId ?? "",
    location_id: i.locationId ?? "",
  });
}

export async function createItem(input: ItemInput): Promise<InventoryItem> {
  return mapInventory(await apiFetch<InventoryDTO>("/inventory", { method: "POST", body: toItemBody(input) }));
}

export async function updateItem(id: string, input: ItemInput): Promise<InventoryItem> {
  return mapInventory(await apiFetch<InventoryDTO>(`/inventory/${id}`, { method: "PATCH", body: toItemBody(input) }));
}

export interface ReceiveInput {
  lotNo: string;
  /** yyyy-mm-dd, optional */
  expireDate: string | null;
  quantity: number;
}

export interface ReceiveResult {
  item: InventoryItem;
  lot: InventoryLot;
}

export async function receiveStock(itemId: string, input: ReceiveInput): Promise<ReceiveResult> {
  const res = await apiFetch<{ item: InventoryDTO; lot: InventoryLotDTO }>(`/inventory/${itemId}/receive`, {
    method: "POST",
    body: JSON.stringify({
      lot_no: input.lotNo,
      expire_date: input.expireDate ? new Date(input.expireDate).toISOString() : null,
      quantity: input.quantity,
    }),
  });
  return { item: mapInventory(res.item), lot: mapInventoryLot(res.lot) };
}

export interface IssueLine {
  lot_id: string;
  quantity: number;
}

export interface IssueShortfall {
  lot_id: string;
  lot_no: string;
  requested: number;
  available: number;
}

export interface IssueResult {
  applied: boolean;
  shortfalls: IssueShortfall[];
  item: InventoryDTO;
  /** only the lots touched by this issue (post-decrement state) */
  lots: InventoryLotDTO[];
}

/**
 * Issue stock out of one item across one or more lots.
 * Overdraw is NOT an error: on 200 the result carries `applied: false` + `shortfalls`
 * and nothing is written. Re-call with `force: true` to allow a lot to go negative.
 */
export function issueStock(itemId: string, lines: IssueLine[], force: boolean): Promise<IssueResult> {
  return apiFetch<IssueResult>(`/inventory/${itemId}/issue`, {
    method: "POST",
    body: JSON.stringify({ lines, force }),
  });
}
