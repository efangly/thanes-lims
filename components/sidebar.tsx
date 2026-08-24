"use client";

import { Icons } from "@/lib/icons";
import type { ModuleId } from "@/lib/data";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { LogoMark } from "@/components/logo";

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

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
}: {
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
  open: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const overview: NavEntry[] = [{ id: "dashboard", label: "แดชบอร์ด", icon: <Icons.Dashboard /> }];
  const assistant: NavEntry[] = [
    { id: "ai-chat", label: "AI Assistant", icon: <Icons.Ai />, dot: true },
  ];
  const modules: NavEntry[] = [
    { id: "samples", label: "การจัดการตัวอย่าง", icon: <Icons.Sample />, num: "01" },
    { id: "equipment", label: "การจัดการเครื่องมือ", icon: <Icons.Equipment />, num: "02", dot: true },
    { id: "environment", label: "ควบคุมสภาพแวดล้อม", icon: <Icons.Env />, num: "03", dot: true },
    { id: "inventory", label: "สินค้าคงคลัง", icon: <Icons.Inventory />, num: "04", dot: true },
    { id: "documents", label: "การจัดการเอกสาร", icon: <Icons.Doc />, num: "05" },
    { id: "tests", label: "ทดสอบ & วิเคราะห์", icon: <Icons.Test />, num: "06" },
  ];

  const renderItem = (e: NavEntry) => {
    const isActive = active === e.id;
    return (
      <button
        key={e.id}
        onClick={() => {
          onNavigate(e.id);
          onClose();
        }}
        className={`relative mb-0.5 flex w-full items-center gap-[11px] rounded-lg px-[11px] py-[9px] text-left text-[13.5px] transition ${
          isActive
            ? "bg-teal font-medium text-white"
            : "text-sidebar-text hover:bg-[var(--color-sidebar-hover)] hover:text-[#e7eef3]"
        }`}
      >
        <span className={`h-[18px] w-[18px] flex-none ${isActive ? "opacity-100" : "opacity-85"}`}>
          {e.icon}
        </span>
        {e.label}
        {e.num && (
          <span
            className={`ml-auto font-mono text-[11px] ${isActive ? "text-white/70" : "text-sidebar-muted"}`}
          >
            {e.num}
          </span>
        )}
        {e.dot && (
          <span
            className="absolute right-2.5 top-[11px] h-1.5 w-1.5 rounded-full bg-amber"
            style={{ boxShadow: `0 0 0 3px ${isActive ? "var(--color-teal)" : "var(--color-sidebar)"}` }}
          />
        )}
      </button>
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

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#0a1520] bg-sidebar text-sidebar-text transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Brand */}
      <div className="flex items-center gap-[11px] border-b border-[var(--color-sidebar-line)] px-5 pb-[18px] pt-[22px]">
        <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-gradient-to-br from-teal to-[#0a6d70] shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]">
          <LogoMark className="h-[15px] w-[15px] text-white" />
        </div>
        <div>
          <div className="font-display text-[16px] font-bold leading-[1.1] tracking-[0.2px] text-white">
            Thanes LIMS
          </div>
          <div className="mt-0.5 font-mono text-[10.5px] tracking-[1px] text-sidebar-muted">
            LAB DATA SYSTEM
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="ปิดเมนู"
          className="ml-auto grid h-8 w-8 flex-none place-items-center rounded-lg text-sidebar-muted transition hover:bg-[var(--color-sidebar-hover)] hover:text-[#e7eef3] md:hidden"
        >
          <Icons.Close className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="px-2.5 pb-[7px] pt-3.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-sidebar-muted">
          ภาพรวม
        </div>
        {overview.map(renderItem)}
        <div className="px-2.5 pb-[7px] pt-3.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-sidebar-muted">
          ผู้ช่วย AI
        </div>
        {assistant.map(renderItem)}
        <div className="px-2.5 pb-[7px] pt-3.5 text-[10px] font-semibold uppercase tracking-[1.4px] text-sidebar-muted">
          โมดูลหลัก
        </div>
        {modules.map(renderItem)}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--color-sidebar-line)] p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.045] px-[9px] py-2">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-[#3a6ea5] to-[#2b4d73] font-display text-xs font-semibold text-white">
            {user ? initialsFor(user.name) : "—"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium leading-tight text-[#e7eef3]">{user?.name ?? "—"}</div>
            <div className="truncate text-[10.5px] text-sidebar-muted">{user?.role ?? ""}</div>
          </div>
          <button
            onClick={logout}
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-sidebar-muted transition hover:bg-[var(--color-sidebar-hover)] hover:text-[#e7eef3]"
          >
            <Icons.Logout className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-[7px] px-[3px] font-mono text-[10.5px] text-sidebar-muted">
          <span className="h-[7px] w-[7px] rounded-full bg-teal animate-pulse-dot" />
          CLOUD · SYNCED · v4.2.1
        </div>
      </div>
      </aside>
    </>
  );
}
