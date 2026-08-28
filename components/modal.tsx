"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { Icons } from "@/lib/icons";

/** Stack of currently-open Modals, innermost last — see the Escape handler below. */
const openModals: object[] = [];

const sizeCls = {
  sm: "max-w-[420px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
};

export function Modal({
  open,
  onClose,
  title,
  icon,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape must close only the topmost dialog: a quick-add opened from inside
  // another modal would otherwise close its parent too, taking the half-filled
  // form with it. Every open Modal pushes itself here; only the last one listens.
  useEffect(() => {
    if (!open) return;
    const token = {};
    openModals.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openModals[openModals.length - 1] !== token) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = openModals.indexOf(token);
      if (i !== -1) openModals.splice(i, 1);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 grid place-items-center bg-black/40 p-4 animate-fade"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] w-full flex-col rounded-[10px] border border-line bg-panel shadow-card outline-none ${sizeCls[size]}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4.5 py-3.75">
          <h3 className="flex items-center gap-2.5 font-display text-[15px] font-semibold">
            {icon && <span className="h-4.25 w-4.25 text-teal-d">{icon}</span>}
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-bg"
          >
            <Icons.Close className="h-[16px] w-[16px]" />
          </button>
        </div>
        <div className="overflow-y-auto px-[18px] py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-line px-[18px] py-3.5">{footer}</div>}
      </div>
    </div>
  );
}
