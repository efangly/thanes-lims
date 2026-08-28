import { apiFetch } from "@/lib/api-client";
import type { InventoryLot } from "@/lib/data";
import { mapInventoryLot, type InventoryDTO, type InventoryLotDTO } from "@/lib/backend-mappers";

/** Lots of an item, backend-sorted by expiry (nulls last) then lot_no. */
export async function listLots(itemId: string): Promise<InventoryLot[]> {
  const rows = await apiFetch<InventoryLotDTO[]>(`/inventory/${itemId}/lots`);
  return rows.map(mapInventoryLot);
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
