"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/lib/icons";
import { Modal } from "@/components/modal";
import {
  Button,
  Card,
  CardHead,
  Field,
  Input,
  PageHead,
  Pagination,
  Select,
  Tag,
  usePagination,
} from "@/components/ui";
import { useUiStore } from "@/lib/stores/ui-store";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/lib/confirm-context";
import { apiErrorMessage } from "@/lib/api-client";
import {
  createUser,
  listUsers,
  reactivateUser,
  resetUserPassword,
  retireUser,
  ROLE_LABELS,
  suspendUser,
  updateUser,
  type CreateUserInput,
  type RoleId,
  type User,
} from "@/lib/users-api";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as RoleId[];

/**
 * User administration (admin only). The gate here is cosmetic — see ADR-0014;
 * the backend enforces `user:*` permissions and 403s anyone else. Retired users
 * are never returned by the API, so this list is active + suspended only.
 */
export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  );
}

function UsersPageInner() {
  const router = useRouter();
  const { user: me, loading: authLoading } = useAuth();
  const pushToast = useUiStore((s) => s.pushToast);
  const confirm = useConfirm();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const isAdmin = me?.role === "admin";

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/dashboard");
  }, [authLoading, isAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (statusFilter !== "all" && u.status !== statusFilter) return false;
        if (!q) return true;
        return `${u.name} ${u.email} ${ROLE_LABELS[u.role] ?? u.role}`.toLowerCase().includes(q);
      }),
    [users, statusFilter, q],
  );

  const pager = usePagination(filtered, { resetKey: `${q}|${statusFilter}` });

  const upsert = (u: User) =>
    setUsers((prev) => (prev.some((x) => x.id === u.id) ? prev.map((x) => (x.id === u.id ? u : x)) : [...prev, u]));

  const handleSaved = (u: User, mode: "created" | "updated") => {
    upsert(u);
    setEditing(null);
    pushToast(mode === "created" ? "เพิ่มผู้ใช้งานเรียบร้อย" : "แก้ไขผู้ใช้งานเรียบร้อย");
  };

  const runAction = async (u: User, action: "suspend" | "reactivate" | "retire") => {
    setBusyId(u.id);
    try {
      if (action === "suspend") {
        const ok = await confirm({
          title: "ระงับผู้ใช้งาน",
          message: `ระงับ "${u.name}"? ทุก session จะถูกตัดทันทีและผู้ใช้จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง`,
          confirmText: "ระงับ",
          cancelText: "ยกเลิก",
        });
        if (!ok) return;
        upsert(await suspendUser(u.id));
        pushToast("ระงับผู้ใช้งานแล้ว", "amber");
      } else if (action === "reactivate") {
        upsert(await reactivateUser(u.id));
        pushToast("เปิดใช้งานผู้ใช้งานแล้ว", "green");
      } else {
        const ok = await confirm({
          title: "ลบผู้ใช้งาน",
          message: `ลบ "${u.name}" ออกจากระบบ? ประวัติและการอ้างอิงยังอยู่ แต่จะกู้คืนบัญชีนี้ไม่ได้ (ถ้ายังเป็นผู้ดูแลตัวอย่าง/สินค้าคงคลังอยู่ ระบบจะไม่ให้ลบ)`,
          confirmText: "ลบถาวร",
          cancelText: "ยกเลิก",
          variant: "danger",
        });
        if (!ok) return;
        await retireUser(u.id);
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        pushToast("ลบผู้ใช้งานแล้ว", "red");
      }
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || !isAdmin) {
    return <div className="grid h-full place-items-center text-[13px] text-muted">กำลังโหลด…</div>;
  }

  return (
    <div className="animate-fade md:flex md:h-full md:flex-col md:overflow-hidden">
      <PageHead
        title="การจัดการผู้ใช้งาน"
        desc="เพิ่ม แก้ไข ระงับ หรือลบบัญชีผู้ใช้ และกำหนดบทบาท (Role) — สิทธิ์การเข้าถึงแต่ละเมนูมาจากบทบาทตาม RBAC"
        primary={{
          label: "เพิ่มผู้ใช้งาน",
          icon: <Icons.Plus className="h-3.75 w-3.75" />,
          onClick: () => setEditing("new"),
        }}
      />

      <Card className="md:flex md:min-h-0 md:flex-1 md:flex-col">
        <CardHead
          icon={<Icons.User />}
          title={`ผู้ใช้งานทั้งหมด${users.length > 0 ? ` (${users.length})` : ""}`}
          right={
            <div className="flex items-center gap-2">
              <div className="w-35">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="active">ใช้งานอยู่</option>
                  <option value="suspended">ถูกระงับ</option>
                </Select>
              </div>
              <div className="w-60">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ / อีเมล / บทบาท"
                />
              </div>
            </div>
          }
        />

        {loading && <div className="px-4.5 py-6 text-center text-[12.5px] text-muted">กำลังโหลด…</div>}
        {error && <div className="px-4.5 py-6 text-center text-[12.5px] text-red">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-4.5 py-6 text-center text-[12.5px] text-muted">
            {users.length === 0 ? "ยังไม่มีผู้ใช้งาน" : "ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข"}
          </div>
        )}

        {filtered.length > 0 && (
          <>
            <div className="overflow-x-auto md:min-h-0 md:flex-1">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {["ชื่อ", "อีเมล", "บทบาท", "สถานะ", ""].map((h, i) => (
                      <th
                        key={i}
                        className="whitespace-nowrap border-b border-line bg-bg px-3.5 py-2.75 text-left text-[10.5px] font-semibold uppercase tracking-[0.7px] text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pager.pageItems.map((u) => {
                    const isSelf = String(u.id) === String(me?.id);
                    return (
                      <tr key={u.id} className="transition hover:bg-bg/60">
                        <td className="border-b border-line px-3.5 py-3 font-medium">
                          {u.name}
                          {isSelf && <span className="ml-1.5 text-[11px] text-muted">(คุณ)</span>}
                        </td>
                        <td className="border-b border-line px-3.5 py-3 font-mono text-[12.5px] text-muted">
                          {u.email}
                        </td>
                        <td className="border-b border-line px-3.5 py-3 text-muted">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </td>
                        <td className="border-b border-line px-3.5 py-3">
                          {u.status === "active" ? (
                            <Tag tone="green" label="ใช้งานอยู่" />
                          ) : (
                            <Tag tone="amber" label="ถูกระงับ" />
                          )}
                        </td>
                        <td className="border-b border-line px-3.5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditing(u)}
                              aria-label="แก้ไข"
                              title="แก้ไข"
                              className="grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-bg hover:text-ink"
                            >
                              <Icons.Edit className="h-3.25 w-3.25" />
                            </button>
                            <button
                              onClick={() => setResetting(u)}
                              aria-label="รีเซ็ตรหัสผ่าน"
                              title="รีเซ็ตรหัสผ่าน"
                              className="grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-bg hover:text-ink"
                            >
                              <Icons.Lock className="h-3.25 w-3.25" />
                            </button>
                            {u.status === "active" ? (
                              <button
                                disabled={isSelf || busyId === u.id}
                                onClick={() => runAction(u, "suspend")}
                                aria-label="ระงับ"
                                title="ระงับ"
                                className="grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-bg hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <Icons.Power className="h-3.25 w-3.25" />
                              </button>
                            ) : (
                              <button
                                disabled={busyId === u.id}
                                onClick={() => runAction(u, "reactivate")}
                                aria-label="เปิดใช้งาน"
                                title="เปิดใช้งาน"
                                className="grid h-7 w-7 place-items-center rounded text-muted transition hover:bg-bg hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                <Icons.Power className="h-3.25 w-3.25" />
                              </button>
                            )}
                            <button
                              disabled={isSelf || busyId === u.id}
                              onClick={() => runAction(u, "retire")}
                              aria-label="ลบ"
                              title="ลบ"
                              className="grid h-7 w-7 place-items-center rounded text-red transition hover:bg-red-bg disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <Icons.Trash className="h-3.25 w-3.25" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pager.page}
              totalPages={pager.totalPages}
              total={pager.total}
              rangeStart={pager.rangeStart}
              rangeEnd={pager.rangeEnd}
              onPage={pager.setPage}
              unit="ผู้ใช้งาน"
            />
          </>
        )}
      </Card>

      <UserFormModal target={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      <ResetPasswordModal
        target={resetting}
        onClose={() => setResetting(null)}
        onDone={() => {
          setResetting(null);
          pushToast("ตั้งรหัสผ่านใหม่แล้ว — ผู้ใช้ต้องเข้าสู่ระบบใหม่", "teal");
        }}
      />
    </div>
  );
}

function UserFormModal({
  target,
  onClose,
  onSaved,
}: {
  target: User | "new" | null;
  onClose: () => void;
  onSaved: (u: User, mode: "created" | "updated") => void;
}) {
  const editingUser = target && target !== "new" ? target : null;
  const [form, setForm] = useState<CreateUserInput>({ name: "", email: "", password: "", role: "general" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setErr(null);
    setForm(
      editingUser
        ? { name: editingUser.name, email: editingUser.email, password: "", role: editingUser.role }
        : { name: "", email: "", password: "", role: "general" },
    );
  }, [target, editingUser]);

  const set = (patch: Partial<CreateUserInput>) => setForm((prev) => ({ ...prev, ...patch }));

  const nameOk = form.name.trim().length > 0;
  const emailOk = /.+@.+\..+/.test(form.email);
  const passwordOk = editingUser ? true : form.password.length >= 8;
  const canSubmit = nameOk && emailOk && passwordOk && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErr(null);
    try {
      if (editingUser) {
        onSaved(await updateUser(editingUser.id, { name: form.name.trim(), role: form.role }), "updated");
      } else {
        onSaved(
          await createUser({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role }),
          "created",
        );
      }
    } catch (e) {
      setErr(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={editingUser ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งาน"}
      icon={<Icons.User />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="teal" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            <Icons.Check className="h-3.5 w-3.5" />
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="ชื่อ-นามสกุล">
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </Field>
        <Field label="อีเมล">
          <Input
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            type="email"
            disabled={!!editingUser}
          />
        </Field>
        {editingUser && (
          <p className="-mt-1.5 text-[11px] text-muted">เปลี่ยนอีเมลไม่ได้ ณ ตอนนี้</p>
        )}
        {!editingUser && (
          <Field label="รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัวอักษร)">
            <Input
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              type="text"
              placeholder="ผู้ใช้เปลี่ยนเองได้ภายหลังที่หน้าโปรไฟล์"
            />
          </Field>
        )}
        <Field label="บทบาท (Role)">
          <Select value={form.role} onChange={(e) => set({ role: e.target.value as RoleId })}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        {err && <p className="text-[12px] text-red">{err}</p>}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  target,
  onClose,
  onDone,
}: {
  target: User | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setPassword("");
      setErr(null);
    }
  }, [target]);

  const canSubmit = password.length >= 8 && !submitting;

  const handleSubmit = async () => {
    if (!target || !canSubmit) return;
    setSubmitting(true);
    setErr(null);
    try {
      await resetUserPassword(target.id, password);
      onDone();
    } catch (e) {
      setErr(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title="รีเซ็ตรหัสผ่าน"
      icon={<Icons.Lock />}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="danger" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "กำลังตั้ง..." : "ตั้งรหัสผ่านใหม่"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="text-[12.5px] text-muted">
          ตั้งรหัสผ่านใหม่ให้ <span className="font-medium text-ink">{target?.name}</span> —
          ทุก session ของผู้ใช้นี้จะถูกตัด และต้องเข้าสู่ระบบใหม่ด้วยรหัสผ่านนี้
        </p>
        <Field label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="text" autoFocus />
        </Field>
        {err && <p className="text-[12px] text-red">{err}</p>}
      </div>
    </Modal>
  );
}
