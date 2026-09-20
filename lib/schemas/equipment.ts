import { z } from "zod";

export const equipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type_code: z.string(),
  last_calibrated_at: z.string(),
  next_calibration_due: z.string(),
  usage_hours: z.number(),
  calibration_pct: z.number(),
  status: z.string(),
  serial_number: z.string().nullish(),
  category: z.string().nullish(),
  manufacturer: z.string().nullish(),
  model: z.string().nullish(),
  installation_date: z.string().nullish(),
  vendor_id: z.string().nullish(),
  location_id: z.string().nullish(),
});
export type EquipmentDTO = z.infer<typeof equipmentSchema>;
