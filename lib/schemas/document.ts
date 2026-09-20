import { z } from "zod";

export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  version: z.string(),
  created_by: z.string(),
  issued_at: z.string(),
  access_level: z.string(),
  locked: z.boolean(),
  filename: z.string().nullish(),
  equipment_id: z.string().nullish(),
  calibration_event_id: z.number().nullish(),
});
export type DocumentDTO = z.infer<typeof documentSchema>;
