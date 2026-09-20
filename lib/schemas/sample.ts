import { z } from "zod";

export const sampleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  custodian_user_id: z.number(),
  location_id: z.string().nullable(),
  status: z.string(),
  received_at: z.string(),
  barcode_id: z.string().nullish(),
  description: z.string().nullish(),
  position: z.string().nullish(),
});
export type SampleDTO = z.infer<typeof sampleSchema>;

/** ฟอร์ม "รับตัวอย่างใหม่" (ขั้น 1) */
export const addSampleFormSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อตัวอย่าง"),
  type: z.string().min(1, "กรุณาเลือกประเภทตัวอย่าง"),
  custodianUserId: z.coerce
    .number({ error: "กรุณาเลือกผู้ดูแล" })
    .int()
    .positive("กรุณาเลือกผู้ดูแล"),
  description: z.string().trim(),
  barcodeId: z
    .string()
    .trim()
    .transform((v) => v || undefined),
});
export type AddSampleForm = z.input<typeof addSampleFormSchema>;
