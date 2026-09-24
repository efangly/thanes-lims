"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  apiErrorMessage,
  apiFetch,
  ApiError,
  getAccessToken,
  onSessionExpired,
  refreshAccessToken,
  setAccessToken,
} from "@/lib/api-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: "active" | "suspended";
  /** `module:action` keys from the access-token claims (e.g. "equipment:edit"). Cosmetic gating only (ADR-0014). */
  permissions: string[];
}

/** Reads the `permissions` claim from the access token payload — no verification, the backend enforces. */
function tokenPermissions(): string[] {
  const token = getAccessToken();
  const payload = token?.split(".")[1];
  if (!payload) return [];
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const perms = (JSON.parse(json) as { permissions?: unknown }).permissions;
    return Array.isArray(perms) ? perms.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

async function fetchMe(): Promise<AuthUser> {
  const me = await apiFetch<Omit<AuthUser, "permissions">>("/users/me");
  return { ...me, permissions: tokenPermissions() };
}

interface LoginResponse {
  access_token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    onSessionExpired(() => {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
      router.push(`/login?redirect=${encodeURIComponent(pathnameRef.current)}`);
    });
  }, [router, queryClient]);

  useEffect(() => {
    refreshAccessToken()
      .then(fetchMe)
      .then((me) => setUser(me))
      .catch(() => setAccessToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const tokens = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      setAccessToken(tokens.access_token);
      const me = await fetchMe();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.code === "unauthorized") {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else if (err instanceof ApiError && err.code === "account_suspended") {
        setError("บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
      } else {
        setError(apiErrorMessage(err));
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "X-SMLIMS-CSRF": "1" },
      });
    } catch (err) {
      console.error("logout request failed", err);
    }
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
    router.push("/login");
  }, [router, queryClient]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Whether the signed-in user's role grants `perm` ("module:action"). Hides chrome only — the backend still 403s. */
export function useCan(perm: string): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(perm) ?? false;
}
