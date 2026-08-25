const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const CSRF_HEADER = { "X-SMLIMS-CSRF": "1" };

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

let sessionExpiredCallback: (() => void) | null = null;

export function onSessionExpired(cb: () => void) {
  sessionExpiredCallback = cb;
}

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { ...CSRF_HEADER },
    });
    if (!res.ok) throw new ApiError(res.status, "unauthorized", "session expired");
    const body: Envelope<{ access_token: string }> = await res.json();
    const token = body.data!.access_token;
    setAccessToken(token);
    return token;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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
  success?: boolean;
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
  if (!res.ok || body.success === false) {
    throw new ApiError(res.status, body.error?.code ?? "unknown", body.error?.message ?? res.statusText);
  }
  return body.data as T;
}

const AUTH_ENDPOINTS_NO_RETRY = ["/auth/login", "/auth/refresh", "/auth/logout"];

async function request<T>(path: string, options: RequestInit, buildHeaders: (token: string | null) => Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(getAccessToken()) });

  if (res.status === 401 && !AUTH_ENDPOINTS_NO_RETRY.includes(path)) {
    try {
      const newToken = await refreshAccessToken();
      const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(newToken) });
      return handleResponse<T>(retryRes);
    } catch {
      setAccessToken(null);
      sessionExpiredCallback?.();
      return handleResponse<T>(res);
    }
  }

  return handleResponse<T>(res);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options, (token) => ({
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  }));
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: formData }, (token) => ({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }));
}
