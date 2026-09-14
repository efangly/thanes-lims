import { apiFetch } from "@/lib/api-client";
import { mapTestResult, type TestResultDTO } from "@/lib/backend-mappers";
import type { TestResult } from "@/lib/data";

/**
 * Records the measured result and moves the test result from `analyzing` to
 * `pending_verification`. Only allowed from `analyzing` — the backend
 * (`SubmitResultUseCase`) rejects any other status with 400.
 */
export async function submitTestResult(id: string, result: string, flag: TestResult["flag"]): Promise<TestResult> {
  const dto = await apiFetch<TestResultDTO>(`/tests/${id}/result`, {
    method: "PATCH",
    body: JSON.stringify({ result, flag }),
  });
  return mapTestResult(dto);
}

/**
 * Approves a test result (`pending_verification` → `approved`), Admin/QA only —
 * the backend (`ApproveResultUseCase`) returns 403 for any other role and 400
 * for any other starting status.
 */
export async function approveTestResult(id: string): Promise<TestResult> {
  const dto = await apiFetch<TestResultDTO>(`/tests/${id}/approve`, { method: "PATCH" });
  return mapTestResult(dto);
}
