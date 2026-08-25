"use client";

import { useEffect, useRef } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** "danger" for destructive actions (delete). "default" for everything else (logout). */
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmDialogOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const danger = options?.variant === "danger";

  useEffect(() => {
    if (!open) return;
    (danger ? cancelRef.current : confirmRef.current)?.focus();
  }, [open, danger]);

  if (!options) return null;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={options.title ?? (danger ? "ยืนยันการลบ" : "ยืนยันการทำรายการ")}
      size="sm"
      footer={
        <>
          <Button ref={cancelRef} variant="ghost" size="sm" onClick={onCancel}>
            {options.cancelText ?? "ยกเลิก"}
          </Button>
          <Button ref={confirmRef} variant={danger ? "danger" : "teal"} size="sm" onClick={onConfirm}>
            {options.confirmText ?? "ยืนยัน"}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink">{options.message}</p>
    </Modal>
  );
}
