import { z } from "zod";

export const testResultSchema = z.object({
  id: z.string(),
  sample_id: z.string(),
  test_name: z.string(),
  analyst: z.string(),
  result: z.string(),
  flag: z.enum(["hi", "lo", "ok"]),
  ref_range: z.string(),
  status: z.string(),
});
export type TestResultDTO = z.infer<typeof testResultSchema>;
