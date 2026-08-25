"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage, apiFetch, ApiError, clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<AuthUser>("/users/me")
      .then((me) => setUser(me))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const tokens = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setTokens(tokens.access_token, tokens.refresh_token);
      const me = await apiFetch<AuthUser>("/users/me");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.code === "unauthorized") {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setError(apiErrorMessage(err));
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) }).catch(() => {});
    }
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

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
