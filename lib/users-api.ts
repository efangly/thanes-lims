import { apiFetch, setAccessToken } from "@/lib/api-client";

/**
 * User management. The backend owns real enforcement (every write below is gated
 * by an RBAC permission and answers 403); the admin screens that call these are
 * only *cosmetically* gated by role — see docs/adr/0014.
 *
 * Two lifecycle states, kept apart on purpose (backend ADR 0010):
 *  - `suspended` — reversible lock-out; login blocked, sessions revoked.
 *  - retired — irreversible soft-delete; the row and its references stay, it just
 *    disappears from every list. Blocked while the user is still a Custodian.
 */
export type UserStatus = "active" | "suspended";

export type RoleId = "admin" | "lab_manager" | "qa" | "scientist" | "general";

export const ROLE_LABELS: Record<RoleId, string> = {
  admin: "ผู้ดูแลระบบ (Admin)",
  lab_manager: "ผู้จัดการห้องปฏิบัติการ",
  qa: "ประกันคุณภาพ (QA)",
  scientist: "นักวิทยาศาสตร์",
  general: "ทั่วไป",
};

export interface User {
  id: number;
  name: string;
  email: string;
  role: RoleId;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: RoleId;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

function mapUser(d: UserDTO): User {
  return {
    id: d.id,
    name: d.name,
    email: d.email,
    role: d.role,
    status: d.status ?? "active",
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

export async function listUsers(): Promise<User[]> {
  const rows = await apiFetch<UserDTO[]>("/users");
  return rows.map(mapUser);
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: RoleId;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return mapUser(
    await apiFetch<UserDTO>("/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function updateUser(id: number, input: { name: string; role: RoleId }): Promise<User> {
  return mapUser(
    await apiFetch<UserDTO>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}

export async function suspendUser(id: number): Promise<User> {
  return mapUser(await apiFetch<UserDTO>(`/users/${id}/suspend`, { method: "POST" }));
}

export async function reactivateUser(id: number): Promise<User> {
  return mapUser(await apiFetch<UserDTO>(`/users/${id}/reactivate`, { method: "POST" }));
}

export async function retireUser(id: number): Promise<void> {
  await apiFetch(`/users/${id}`, { method: "DELETE" });
}

export async function resetUserPassword(id: number, password: string): Promise<void> {
  await apiFetch(`/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

/* ---------- self-service (any authenticated role) ---------- */

export async function updateOwnProfile(name: string): Promise<User> {
  return mapUser(
    await apiFetch<UserDTO>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  );
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  // The backend revokes every other session and hands back a fresh access token
  // for this one, so the current tab stays logged in.
  const { access_token } = await apiFetch<{ access_token: string }>("/users/me/password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  setAccessToken(access_token);
}

export async function logoutOtherDevices(): Promise<void> {
  await apiFetch("/auth/logout-all", { method: "POST" });
}
