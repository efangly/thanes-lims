"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Icons, resolveIcon } from "@/lib/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { MODULE_META, type ModuleId } from "@/lib/data";
import { useLims } from "@/components/lims-data-context";
import { usePageActionsSlot, type PageAction } from "@/components/page-actions-context";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/lib/confirm-context";

const toneCls = {
  teal: "bg-teal-bg text-teal-d",
  amber: "bg-amber-bg text-amber",
  red: "bg-red-bg text-red",
  green: "bg-green-bg text-green",
  violet: "bg-violet-bg text-violet",
  grey: "bg-bg-2 text-muted",
};

function NotificationIcon({ name, className }: { name: string; className?: string }) {
  const Icon = resolveIcon(name);
  return <Icon className={className} />;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Topbar({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const active = (pathname?.split("/")[1] || "dashboard") as ModuleId;
  const meta = MODULE_META[active];
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useLims();
  const pageActions = usePageActionsSlot();
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBellOpen(false);
        setMoreOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const runAction = (a: PageAction) => {
    if (a.onClick) a.onClick();
    if (a.href) router.push(a.href);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "ออกจากระบบ",
      message: "คุณต้องการออกจากระบบใช่หรือไม่?",
      confirmText: "ออกจากระบบ",
      cancelText: "ยกเลิก",
    });
    if (ok) logout();
  };

  return (
    <div className="flex h-15 flex-none items-center gap-2 border-b border-line bg-panel px-4 md:gap-4 md:px-6">
      <button
        onClick={onMenuClick}
        aria-label="เปิดเมนู"
        className="grid h-11 w-11 flex-none place-items-center rounded-lg border border-line text-muted transition hover:bg-bg md:hidden md:h-9.5 md:w-9.5"
      >
        <Icons.Menu className="h-4.5 w-4.5" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col leading-[1.15] md:flex-none">
        <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.5px] text-muted-2">
          {meta.code}
        </span>
        <span className="truncate font-display text-[16px] font-semibold text-ink">{meta.title}</span>
      </div>

      <div className="ml-auto flex flex-none items-center gap-2 md:gap-2.5">
        {pageActions?.back && (
          <button
            onClick={() => runAction({ label: pageActions.back!.label, href: pageActions.back!.href })}
            aria-label={pageActions.back.label}
            title={pageActions.back.label}
            className="grid h-11 w-11 flex-none place-items-center rounded-lg border border-line text-muted transition hover:bg-bg md:h-9.5 md:w-9.5"
          >
            <Icons.Arrow className="h-4 w-4 rotate-180" />
          </button>
        )}

        {pageActions?.custom}

        {pageActions?.secondary && pageActions.secondary.length === 1 && (
          <button
            onClick={() => runAction(pageActions.secondary![0])}
            disabled={pageActions.secondary[0].disabled}
            aria-label={pageActions.secondary[0].label}
            title={pageActions.secondary[0].label}
            className="grid h-11 w-11 flex-none place-items-center rounded-lg border border-line text-muted transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-45 md:h-9.5 md:w-9.5"
          >
            <span className="h-4 w-4">{pageActions.secondary[0].icon}</span>
          </button>
        )}

        {pageActions?.secondary && pageActions.secondary.length > 1 && (
          <div ref={moreRef} className="relative flex-none">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="ตัวเลือกเพิ่มเติม"
              className="grid h-11 w-11 place-items-center rounded-lg border border-line text-muted transition hover:bg-bg md:h-9.5 md:w-9.5"
            >
              <Icons.More className="h-4.25 w-4.25" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-11.5 z-50 w-55 overflow-hidden rounded-lg border border-line bg-panel shadow-card">
                {pageActions.secondary.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (a.disabled) return;
                      runAction(a);
                      setMoreOpen(false);
                    }}
                    disabled={a.disabled}
                    className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-left text-[12.5px] font-medium text-ink transition last:border-none hover:bg-bg disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {a.icon && <span className="h-3.75 w-3.75 flex-none">{a.icon}</span>}
                    <span className="truncate">{a.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {pageActions?.primary && (
          <button
            onClick={() => runAction(pageActions.primary!)}
            disabled={pageActions.primary.disabled}
            className="inline-flex h-11 flex-none items-center gap-1.75 rounded-lg bg-teal px-3 text-[13px] font-medium text-white transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 md:h-9.5 lg:px-3.75"
          >
            {pageActions.primary.icon && (
              <span className="h-3.75 w-3.75 flex-none">{pageActions.primary.icon}</span>
            )}
            <span className="hidden lg:inline">{pageActions.primary.label}</span>
          </button>
        )}
      </div>

      <ThemeToggle />

      <div ref={bellRef} className="relative flex-none">
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="relative grid h-11 w-11 place-items-center rounded-lg border border-line text-muted transition hover:bg-bg md:h-9.5 md:w-9.5"
        >
          <Icons.Bell className="h-4.25 w-4.25" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-panel bg-red px-0.75 font-mono text-[9px] font-semibold leading-none text-white">
              {unreadCount}
            </span>
          )}
        </button>
        {bellOpen && (
          <div className="absolute right-0 top-11.5 z-50 w-85 overflow-hidden rounded-lg border border-line bg-panel shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h4 className="font-display text-[13.5px] font-semibold">การแจ้งเตือน</h4>
              <button
                onClick={markAllRead}
                className="text-[11.5px] font-medium text-teal-d hover:underline"
              >
                ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
              </button>
            </div>
            <div className="max-h-90 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-muted">ไม่มีการแจ้งเตือน</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`flex w-full items-start gap-2.5 border-b border-line px-4 py-3 text-left transition last:border-none hover:bg-bg/60 ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <span className={`grid h-8 w-8 flex-none place-items-center rounded-[9px] ${toneCls[n.tone]}`}>
                      <NotificationIcon name={n.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[12.5px] font-medium">
                        {!n.read && <span className="h-1.5 w-1.5 flex-none rounded-full bg-teal" />}
                        <span className="truncate">{n.title}</span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted">{n.message}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-muted-2">{n.time}</div>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div ref={userRef} className="relative flex-none">
        <button
          onClick={() => setUserOpen((v) => !v)}
          aria-label="เมนูผู้ใช้"
          className="flex h-11 w-11 items-center justify-center gap-1 rounded-lg border border-line pl-1 pr-1 text-muted transition hover:bg-bg md:h-9.5 md:w-auto md:pr-1.5"
        >
          <span className="grid h-8.5 w-8.5 flex-none place-items-center rounded-full bg-gradient-to-br from-[#3a6ea5] to-[#2b4d73] font-display text-xs font-semibold text-white md:h-7.5 md:w-7.5">
            {user ? initialsFor(user.name) : "—"}
          </span>
          <Icons.Chevron className="hidden h-3.5 w-3.5 flex-none rotate-90 text-muted md:block" />
        </button>
        {userOpen && (
          <div className="absolute right-0 top-11.5 z-50 w-52 overflow-hidden rounded-lg border border-line bg-panel shadow-card">
            <Link
              href="/profile"
              onClick={() => setUserOpen(false)}
              className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-[12.5px] font-medium text-ink transition hover:bg-bg"
            >
              <Icons.User className="h-3.75 w-3.75 flex-none" />
              โปรไฟล์ของฉัน
            </Link>
            <button
              onClick={() => {
                setUserOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-ink transition hover:bg-bg"
            >
              <Icons.Logout className="h-3.75 w-3.75 flex-none" />
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
