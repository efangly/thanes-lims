"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Icons } from "@/lib/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui";
import { MODULE_META, type ModuleId } from "@/lib/data";
import { useLims, type ModalKey } from "@/components/lims-data-context";

const toneCls = {
  teal: "bg-teal-bg text-teal-d",
  amber: "bg-amber-bg text-amber",
  red: "bg-red-bg text-red",
  green: "bg-green-bg text-green",
  violet: "bg-violet-bg text-violet",
  grey: "bg-bg-2 text-muted",
};

const notifIcons = {
  Env: <Icons.Env />,
  Sample: <Icons.Sample />,
  Equipment: <Icons.Equipment />,
  Inventory: <Icons.Inventory />,
  Doc: <Icons.Doc />,
  Test: <Icons.Test />,
};

const addModalByModule: Partial<Record<ModuleId, ModalKey>> = {
  samples: "add-sample",
  equipment: "add-equipment",
  environment: "add-sensor",
  inventory: "add-inventory",
  documents: "upload-document",
  tests: "open-test-order",
};

export function Topbar({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const active = (pathname?.split("/")[1] || "dashboard") as ModuleId;
  const meta = MODULE_META[active];
  const { notifications, unreadCount, markNotificationRead, markAllRead, openModal, samples, equipment, inventory, documents } = useLims();

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBellOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: { id: string; label: string; sub: string; module: ModuleId; icon: ReactNode }[] = [];
    samples
      .filter((s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .forEach((s) => out.push({ id: s.id, label: s.name, sub: s.id, module: "samples", icon: <Icons.Sample /> }));
    equipment
      .filter((e) => e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))
      .forEach((e) => out.push({ id: e.id, label: e.name, sub: e.id, module: "equipment", icon: <Icons.Equipment /> }));
    inventory
      .filter((i) => i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .forEach((i) => out.push({ id: i.id, label: i.name, sub: i.id, module: "inventory", icon: <Icons.Inventory /> }));
    documents
      .filter((d) => d.name.toLowerCase().includes(q))
      .forEach((d) => out.push({ id: d.name, label: d.name, sub: d.type, module: "documents", icon: <Icons.Doc /> }));
    return out.slice(0, 8);
  }, [query, samples, equipment, inventory, documents]);

  const addModal = addModalByModule[active];

  return (
    <div className="flex h-[60px] flex-none items-center gap-4 border-b border-line bg-panel px-6">
      <button
        onClick={onMenuClick}
        aria-label="เปิดเมนู"
        className="grid h-[38px] w-[38px] flex-none place-items-center rounded-lg border border-line text-muted transition hover:bg-bg md:hidden"
      >
        <Icons.Menu className="h-[18px] w-[18px]" />
      </button>

      <div className="flex flex-col leading-[1.15]">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.5px] text-muted-2">
          {meta.code}
        </span>
        <span className="font-display text-[16px] font-semibold text-ink">{meta.title}</span>
      </div>

      <div ref={searchRef} className="relative ml-auto hidden w-[280px] md:block">
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-bg px-[13px] py-2 text-muted">
          <Icons.Search className="h-[15px] w-[15px] flex-none" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="ค้นหาตัวอย่าง, เครื่องมือ, เอกสาร…"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted-2"
          />
        </div>
        {searchOpen && query.trim() && (
          <div className="absolute right-0 top-[46px] z-50 w-full overflow-hidden rounded-lg border border-line bg-panel shadow-card">
            {results.length === 0 ? (
              <div className="px-4 py-4 text-center text-[12.5px] text-muted">ไม่พบผลลัพธ์</div>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.module}-${r.id}`}
                  onClick={() => {
                    router.push(`/${r.module}`);
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-left transition last:border-none hover:bg-bg"
                >
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-bg-2 text-muted">
                    <span className="h-[14px] w-[14px]">{r.icon}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">{r.label}</div>
                    <div className="truncate font-mono text-[11px] text-muted">{r.sub}</div>
                  </span>
                  <span className="font-mono text-[10.5px] text-muted-2">{MODULE_META[r.module].title}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <ThemeToggle />

      <div ref={bellRef} className="relative">
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="relative grid h-[38px] w-[38px] place-items-center rounded-lg border border-line text-muted transition hover:bg-bg"
        >
          <Icons.Bell className="h-[17px] w-[17px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[16px] min-w-[16px] place-items-center rounded-full border-2 border-panel bg-red px-[3px] font-mono text-[9px] font-semibold leading-none text-white">
              {unreadCount}
            </span>
          )}
        </button>
        {bellOpen && (
          <div className="absolute right-0 top-[46px] z-50 w-[340px] overflow-hidden rounded-lg border border-line bg-panel shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h4 className="font-display text-[13.5px] font-semibold">การแจ้งเตือน</h4>
              <button
                onClick={markAllRead}
                className="text-[11.5px] font-medium text-teal-d hover:underline"
              >
                ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
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
                      <span className="h-4 w-4">{notifIcons[n.icon]}</span>
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

      {addModal && (
        <Button variant="ink" className="hidden sm:inline-flex" onClick={() => openModal(addModal)}>
          <Icons.Plus className="h-[15px] w-[15px]" />
          เพิ่มรายการใหม่
        </Button>
      )}
    </div>
  );
}
