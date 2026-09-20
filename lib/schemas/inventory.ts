import { z } from "zod";

export const inventorySchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  quantity: z.number(),
  unit: z.string(),
  min: z.number(),
  max: z.number(),
  pct: z.number(),
  status: z.string(),
  default_vendor: z.string(),
  custodian_user_id: z.number().nullish(),
  manufacturer: z.string().nullish(),
  vendor_id: z.string().nullish(),
  location_id: z.string().nullish(),
  earliest_expire_date: z.string().nullish(),
  lot_count: z.number().nullish(),
});
export type InventoryDTO = z.infer<typeof inventorySchema>;
