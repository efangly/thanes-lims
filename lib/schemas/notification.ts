import { z } from "zod";

export const notificationSchema = z.object({
  id: z.string(),
  tone: z.string(),
  icon: z.string(),
  title: z.string(),
  message: z.string(),
  created_at: z.string(),
  read: z.boolean(),
});
export type NotificationDTO = z.infer<typeof notificationSchema>;
