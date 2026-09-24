import { z } from "zod";

/** Server-derived due status (backend equipment-maintenance guide). `none` = no plan, NOT ready. */
export const dueStatusSchema = z.enum(["ready", "due_soon", "overdue", "none"]);
export type DueStatusDTO = z.infer<typeof dueStatusSchema>;

export const equipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type_code: z.string(),
  last_calibrated_at: z.string(),
  next_calibration_due: z.string(),
  usage_hours: z.number(),
  calibration_pct: z.number(),
  /** Deprecated — equals calibration_status. */
  status: z.string(),
  serial_number: z.string().nullish(),
  category: z.string().nullish(),
  manufacturer: z.string().nullish(),
  model: z.string().nullish(),
  installation_date: z.string().nullish(),
  vendor_id: z.string().nullish(),
  location_id: z.string().nullish(),
  calibration_status: dueStatusSchema.catch("none"),
  maintenance_status: dueStatusSchema.catch("none"),
  overall_status: dueStatusSchema.catch("none"),
});
export type EquipmentDTO = z.infer<typeof equipmentSchema>;

const statusCountsSchema = z.object({
  ready: z.number(),
  due_soon: z.number(),
  overdue: z.number(),
  none: z.number(),
});

export const equipmentSummarySchema = z.object({
  total: z.number(),
  overall: statusCountsSchema,
  calibration: statusCountsSchema,
  maintenance: statusCountsSchema,
});
export type EquipmentSummaryDTO = z.infer<typeof equipmentSummarySchema>;
