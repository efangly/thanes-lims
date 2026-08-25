const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const ACCESS_TOKEN_KEY = "thanes_lims_access_token";
const REFRESH_TOKEN_KEY = "thanes_lims_refresh_token";
const TOKEN_MAX_AGE_DAYS = 30;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 24 * 60 * 60}; samesite=lax${secure}`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function getAccessToken(): string | null {
  return getCookie(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return getCookie(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  setCookie(ACCESS_TOKEN_KEY, accessToken, TOKEN_MAX_AGE_DAYS);
  setCookie(REFRESH_TOKEN_KEY, refreshToken, TOKEN_MAX_AGE_DAYS);
}

export function clearTokens() {
  deleteCookie(ACCESS_TOKEN_KEY);
  deleteCookie(REFRESH_TOKEN_KEY);
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
  if (res.status === 204) {
    if (!res.ok) throw new ApiError(res.status, "unknown", res.statusText);
    return undefined as T;
  }
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
