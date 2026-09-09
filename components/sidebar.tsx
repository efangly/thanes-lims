"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/lib/icons";
import type { ModuleId } from "@/lib/data";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/lib/confirm-context";
import { LogoMark } from "@/components/logo";
import { version as APP_VERSION } from "@/package.json";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface NavEntry {
  id: ModuleId;
  label: string;
  icon: ReactNode;
  num?: string;
  dot?: boolean;
}

// The 01–06 numbering mirrors the requirement document; master data (locations,
// vendors) is deliberately left unnumbered so the mapping stays intact.
const OVERVIEW: NavEntry[] = [{ id: "dashboard", label: "แดชบอร์ด", icon: <Icons.Dashboard /> }];
const ASSISTANT: NavEntry[] = [{ id: "ai-chat", label: "คอนโซลสอบถามข้อมูล", icon: <Icons.Ai /> }];
const MODULES: NavEntry[] = [
  { id: "samples", label: "การจัดการตัวอย่าง", icon: <Icons.Sample />, num: "01" },
  { id: "equipment", label: "การจัดการเครื่องมือ", icon: <Icons.Equipment />, num: "02", dot: true },
  { id: "environment", label: "ควบคุมสภาพแวดล้อม", icon: <Icons.Env />, num: "03", dot: true },
  { id: "inventory", label: "สินค้าคงคลัง", icon: <Icons.Inventory />, num: "04", dot: true },
  { id: "documents", label: "การจัดการเอกสาร", icon: <Icons.Doc />, num: "05" },
  { id: "tests", label: "ทดสอบ & วิเคราะห์", icon: <Icons.Test />, num: "06" },
];
const MASTER: NavEntry[] = [
  { id: "locations", label: "ตำแหน่งจัดเก็บ", icon: <Icons.Loc /> },
  { id: "vendors", label: "ผู้ขาย (Vendor)", icon: <Icons.Cart /> },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const pathname = usePathname();
  const active = (pathname?.split("/")[1] || "dashboard") as ModuleId;

  const handleLogout = async () => {
    const ok = await confirm({
      title: "ออกจากระบบ",
      message: "คุณต้องการออกจากระบบใช่หรือไม่?",
      confirmText: "ออกจากระบบ",
      cancelText: "ยกเลิก",
    });
    if (ok) logout();
  };

  // Desktop: 64px icon rail with tooltips + corner numerals.
  const railItem = (e: NavEntry) => {
    const isActive = active === e.id;
    return (
      <Link
        key={e.id}
        href={`/${e.id}`}
        onClick={onClose}
        title={e.label}
        aria-label={e.label}
        className={`group relative grid h-11 w-11 place-items-center rounded transition ${
          isActive
            ? "bg-ink text-panel"
            : "text-sidebar-text hover:bg-[var(--color-sidebar-hover)] hover:text-ink"
        }`}
      >
        <span className="h-[18px] w-[18px]">{e.icon}</span>
        {e.num && (
          <span
            className={`absolute right-[3px] top-[2px] font-mono text-[8px] ${
              isActive ? "text-panel/60" : "text-sidebar-muted"
            }`}
          >
            {e.num}
          </span>
        )}
        {e.dot && (
          <span className="absolute right-[4px] bottom-[5px] h-1.5 w-1.5 rounded-full bg-amber" />
        )}
      </Link>
    );
  };

  // Mobile: full slide-in drawer with labels.
  const drawerItem = (e: NavEntry) => {
    const isActive = active === e.id;
    return (
      <Link
        key={e.id}
        href={`/${e.id}`}
        onClick={onClose}
        className={`relative mb-0.5 flex w-full items-center gap-[11px] rounded px-[11px] py-[9px] text-left text-[13.5px] transition ${
          isActive
            ? "bg-ink font-medium text-panel"
            : "text-sidebar-text hover:bg-[var(--color-sidebar-hover)] hover:text-ink"
        }`}
      >
        <span className="h-[18px] w-[18px] flex-none">{e.icon}</span>
        {e.label}
        {e.num && (
          <span className={`ml-auto font-mono text-[11px] ${isActive ? "text-panel/60" : "text-sidebar-muted"}`}>
            {e.num}
          </span>
        )}
        {e.dot && <span className="absolute right-2.5 top-[13px] h-1.5 w-1.5 rounded-full bg-amber" />}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ===== Desktop icon rail ===== */}
      <aside className="hidden border-r border-[var(--color-sidebar-line)] bg-sidebar md:flex md:flex-col md:items-center md:py-3">
        <Link href="/dashboard" title="Thanes LIMS" className="grid h-10 w-10 flex-none place-items-center rounded bg-ink">
          <LogoMark className="h-[15px] w-[15px] text-panel" />
        </Link>
        <nav className="mt-3 flex flex-1 flex-col items-center gap-1">
          {OVERVIEW.map(railItem)}
          {ASSISTANT.map(railItem)}
          <span className="my-1 h-px w-6 bg-[var(--color-sidebar-line)]" />
          {MODULES.map(railItem)}
          <span className="my-1 h-px w-6 bg-[var(--color-sidebar-line)]" />
          {MASTER.map(railItem)}
        </nav>
        <div className="mt-2 flex flex-col items-center gap-2">
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
            className="grid h-9 w-9 place-items-center rounded text-sidebar-muted transition hover:bg-[var(--color-sidebar-hover)] hover:text-ink"
          >
            <Icons.Logout className="h-4 w-4" />
          </button>
          <span
            title={`CLOUD · SYNCED · v${APP_VERSION}`}
            className="flex flex-col items-center gap-1 font-mono text-[7px] tracking-[1px] text-sidebar-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse-dot" />
            SYNC
          </span>
        </div>
      </aside>

      {/* ===== Mobile drawer ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[var(--color-sidebar-line)] bg-sidebar text-sidebar-text transition-transform duration-200 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-[11px] border-b border-[var(--color-sidebar-line)] px-5 pb-[18px] pt-[22px]">
          <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded bg-ink">
            <LogoMark className="h-[15px] w-[15px] text-panel" />
          </div>
          <div>
            <div className="font-display text-[16px] font-bold leading-[1.1] text-ink">Thanes LIMS</div>
            <div className="mt-0.5 font-mono text-[10px] tracking-[1px] text-sidebar-muted">LAB DATA SYSTEM</div>
          </div>
          <button
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="ml-auto grid h-8 w-8 flex-none place-items-center rounded text-sidebar-muted transition hover:bg-[var(--color-sidebar-hover)] hover:text-ink"
          >
            <Icons.Close className="h-[18px] w-[18px]" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {[
            ["ภาพรวม", OVERVIEW],
            ["สอบถามข้อมูล", ASSISTANT],
            ["โมดูลหลัก", MODULES],
            ["ข้อมูลหลัก", MASTER],
          ].map(([label, list]) => (
            <div key={label as string}>
              <div className="px-2.5 pb-[7px] pt-3.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-sidebar-muted">
                {label as string}
              </div>
              {(list as NavEntry[]).map(drawerItem)}
            </div>
          ))}
        </nav>
        <div className="border-t border-[var(--color-sidebar-line)] p-3">
          <div className="flex items-center gap-2.5 rounded bg-[var(--color-sidebar-hover)] px-[9px] py-2">
            <span className="grid h-8 w-8 flex-none place-items-center rounded bg-ink font-mono text-[11px] font-medium text-panel">
              {user ? initialsFor(user.name) : "—"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium leading-tight text-ink">{user?.name ?? "—"}</div>
              <div className="truncate text-[10.5px] text-sidebar-muted">{user?.role ?? ""}</div>
            </div>
            <button
              onClick={handleLogout}
              aria-label="ออกจากระบบ"
              className="grid h-7 w-7 flex-none place-items-center rounded text-sidebar-muted transition hover:bg-[var(--color-sidebar-hover)] hover:text-ink"
            >
              <Icons.Logout className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-[7px] px-[3px] font-mono text-[10.5px] text-sidebar-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-green animate-pulse-dot" />
            CLOUD · SYNCED · v{APP_VERSION}
          </div>
        </div>
      </aside>
    </>
  );
}
