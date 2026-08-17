const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const ACCESS_TOKEN_KEY = "thanes_lims_access_token";
const REFRESH_TOKEN_KEY = "thanes_lims_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ERROR_MESSAGE: Record<string, string> = {
  validation_failed: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบฟอร์มอีกครั้ง",
  not_found: "ไม่พบข้อมูลที่ต้องการ",
  conflict: "ข้อมูลซ้ำหรือขัดแย้งกับข้อมูลที่มีอยู่แล้ว",
  unauthorized: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
  forbidden: "คุณไม่มีสิทธิ์ทำรายการนี้",
  internal_error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
};

export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return ERROR_MESSAGE[err.code] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }
  if (err instanceof Error) return err.message;
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  meta?: unknown;
  error?: { code: string; message: string };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body: Envelope<T> = await res.json().catch(() => ({ success: false, error: { code: "parse_error", message: res.statusText } }));
  if (!res.ok || !body.success) {
    if (res.status === 401) clearTokens();
    throw new ApiError(res.status, body.error?.code ?? "unknown", body.error?.message ?? res.statusText);
  }
  return body.data as T;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return handleResponse<T>(res);
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: formData, headers });
  return handleResponse<T>(res);
}
